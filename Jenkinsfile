pipeline {
  agent any

  environment {
    NODE_VERSION = '20'
    DEPLOY_DIR = '/var/www/adminstro'
    BACKUP_DIR = '/var/www/adminstro_backups'
    CACHE_DIR = '/var/jenkins_home/.npm-cache'
    REPO_URL = 'https://github.com/ZairoDev/Adminstro.git'
    BRANCH = 'main'
    PM2_APP_NAME = 'adminstro'
    TIMESTAMP = sh(script: "date +%Y%m%d_%H%M%S", returnStdout: true).trim()
    PATH = "/usr/local/bin:/usr/bin:/bin:${env.PATH}"
    NODE_ENV = 'production'
    NEXT_TELEMETRY_DISABLED = '1'
  }

  options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  stages {
    stage('Pre-deployment Checks') {
      steps {
        script {
          echo '🔍 Running pre-deployment checks...'
          
          sh '''
            # Create directories
            sudo mkdir -p ${DEPLOY_DIR}
            sudo mkdir -p ${BACKUP_DIR}
            sudo mkdir -p ${CACHE_DIR}
            sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
            sudo chown -R jenkins:jenkins ${BACKUP_DIR}
            sudo chown -R jenkins:jenkins ${CACHE_DIR}
            
            # Verify PM2
            if ! command -v pm2 &> /dev/null; then
              echo "Installing PM2..."
              sudo npm install -g pm2@latest
            fi
            echo "✅ PM2 version: $(pm2 -v)"
          '''
          
          // Check for previous deployment
          env.HAS_PREVIOUS_DEPLOYMENT = sh(
            script: "[ -d '${DEPLOY_DIR}/.next' ] && echo 'true' || echo 'false'",
            returnStdout: true
          ).trim()
          
          echo "Previous deployment exists: ${env.HAS_PREVIOUS_DEPLOYMENT}"
        }
      }
    }

    stage('Backup') {
      when {
        expression { env.HAS_PREVIOUS_DEPLOYMENT == 'true' }
      }
      steps {
        script {
          echo '💾 Creating backup...'
          sh '''
            # Backup .env.production
            mkdir -p /tmp/jenkins_env_backup
            if [ -f "${DEPLOY_DIR}/.env.production" ]; then
              cp ${DEPLOY_DIR}/.env.production /tmp/jenkins_env_backup/.env.production
              echo "✅ .env.production backed up"
            fi
            
            # Backup current deployment
            BACKUP_PATH=${BACKUP_DIR}/backup_${TIMESTAMP}
            mkdir -p $BACKUP_PATH
            
            cd ${DEPLOY_DIR}
            [ -d ".next" ] && cp -r .next $BACKUP_PATH/ || true
            [ -f "package.json" ] && cp package.json $BACKUP_PATH/ || true
            [ -f "package-lock.json" ] && cp package-lock.json $BACKUP_PATH/ || true
            
            pm2 save --force || true
            
            echo $BACKUP_PATH > /tmp/current_backup_path.txt
            
            # Keep only last 5 backups
            cd ${BACKUP_DIR}
            ls -t | tail -n +6 | xargs -r rm -rf
            
            echo "✅ Backup created at: $BACKUP_PATH"
          '''
          
          env.BACKUP_PATH = sh(script: "cat /tmp/current_backup_path.txt 2>/dev/null || echo ''", returnStdout: true).trim()
        }
      }
    }

    stage('Checkout Code') {
      steps {
        script {
          echo '📦 Checking out code...'
          
          checkout([
            $class: 'GitSCM',
            branches: [[name: "*/${BRANCH}"]],
            userRemoteConfigs: [[
              credentialsId: 'hostinger_ssh',
              url: "${REPO_URL}"
            ]],
            extensions: [
              [$class: 'CloneOption', depth: 1, noTags: false, shallow: true]
            ]
          ])
          
          sh '''
            echo "Branch: $(git branch --show-current)"
            echo "Commit: $(git log -1 --oneline)"
            
            if [ ! -f "package.json" ]; then
              echo "❌ package.json NOT FOUND!"
              exit 1
            fi
            echo "✅ package.json found"
          '''
        }
      }
    }

    stage('Sync Code') {
      steps {
        script {
          echo '📁 Syncing code...'
          sh '''
            rsync -av --delete \
              --exclude=node_modules \
              --exclude=.next \
              --exclude=.git \
              --exclude=.env.local \
              --exclude=.env.production \
              ./ ${DEPLOY_DIR}/
            
            sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
            
            # Restore .env.production
            if [ -f /tmp/jenkins_env_backup/.env.production ]; then
              cp /tmp/jenkins_env_backup/.env.production ${DEPLOY_DIR}/.env.production
              echo "✅ .env.production restored"
            else
              echo "❌ WARNING: No .env.production found!"
            fi
          '''
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        script {
          echo '📦 Installing dependencies...'
          sh '''
            cd ${DEPLOY_DIR}
            
            # Configure npm
            npm config set cache ${CACHE_DIR}
            
            # Clean install
            rm -rf node_modules
            
            if [ -f "package-lock.json" ]; then
              echo "Using npm ci..."
              npm ci --legacy-peer-deps --cache ${CACHE_DIR}
            else
              echo "Using npm install..."
              npm install --legacy-peer-deps --cache ${CACHE_DIR}
            fi
            
            echo "✅ Dependencies installed"
            echo "Size: $(du -sh node_modules | cut -f1)"
          '''
        }
      }
    }

    stage('Build Application') {
      steps {
        script {
          echo '🏗️ Building application...'
          sh '''
            cd ${DEPLOY_DIR}
            
            # Remove old build
            rm -rf .next
            
            # Build
            export NODE_ENV=production
            export NEXT_TELEMETRY_DISABLED=1
            
            npm run build 2>&1 | tee build.log
            
            # Verify build
            if [ ! -f ".next/BUILD_ID" ]; then
              echo "❌ Build failed - no BUILD_ID found"
              tail -50 build.log
              exit 1
            fi
            
            echo "✅ Build successful"
            echo "BUILD_ID: $(cat .next/BUILD_ID)"
          '''
        }
      }
    }

    stage('Deploy with PM2') {
      steps {
        script {
          echo '🚀 Deploying...'
          sh '''
            cd ${DEPLOY_DIR}
            
            # Stop old instance
            pm2 delete ${PM2_APP_NAME} 2>/dev/null || true
            pm2 flush
            
            # Start new instance
            pm2 start npm \
              --name "${PM2_APP_NAME}" \
              --interpreter node \
              --cwd ${DEPLOY_DIR} \
              --time \
              --env NODE_ENV=production \
              --max-memory-restart 500M \
              -- run start
            
            pm2 save --force
            pm2 startup systemd -u jenkins --hp /var/lib/jenkins || true
            
            sleep 10
            
            # Verify
            if pm2 describe ${PM2_APP_NAME} | grep -q 'status.*online'; then
              echo "✅ Application is online"
            else
              echo "❌ Application failed to start"
              pm2 logs ${PM2_APP_NAME} --nostream --lines 30
              exit 1
            fi
          '''
        }
      }
    }

    stage('Health Check') {
      steps {
        script {
          echo '🏥 Health check...'
          
          retry(3) {
            sleep(time: 5, unit: 'SECONDS')
            
            sh '''
              if ! pm2 describe ${PM2_APP_NAME} | grep -q 'status.*online'; then
                echo "❌ Application not online"
                exit 1
              fi
              
              RESTART_COUNT=$(pm2 describe ${PM2_APP_NAME} | grep 'restarts' | awk '{print $NF}' | grep -o '[0-9]*')
              if [ "$RESTART_COUNT" -gt 2 ]; then
                echo "❌ Too many restarts: $RESTART_COUNT"
                exit 1
              fi
              
              echo "✅ Health check passed"
            '''
          }
        }
      }
    }

    stage('Cleanup') {
      steps {
        script {
          echo '🧹 Cleanup...'
          sh '''
            find ${CACHE_DIR} -type f -mtime +7 -delete 2>/dev/null || true
            find ${DEPLOY_DIR} -name "build.log*" -mtime +7 -delete 2>/dev/null || true
            rm -rf /tmp/jenkins_env_backup
            rm -f /tmp/current_backup_path.txt
            echo "✅ Cleanup completed"
          '''
        }
      }
    }
  }

  post {
    success {
      script {
        echo '✅✅✅ DEPLOYMENT SUCCESSFUL! ✅✅✅'
        sh '''
          echo "Job: ${JOB_NAME} #${BUILD_NUMBER}"
          echo "Branch: ${BRANCH}"
          echo "Timestamp: ${TIMESTAMP}"
          pm2 list
        '''
      }
    }
    
    failure {
      script {
        echo '❌❌❌ DEPLOYMENT FAILED! ❌❌❌'
        
        if (env.HAS_PREVIOUS_DEPLOYMENT == 'true' && env.BACKUP_PATH) {
          echo '🔄 Rolling back...'
          
          sh """
            cd ${DEPLOY_DIR}
            
            pm2 delete ${PM2_APP_NAME} || true
            pm2 flush
            
            if [ -d "${env.BACKUP_PATH}/.next" ]; then
              rm -rf .next
              cp -r ${env.BACKUP_PATH}/.next ./
              echo "✅ Restored .next"
            fi
            
            if [ -f "${env.BACKUP_PATH}/package.json" ]; then
              cp ${env.BACKUP_PATH}/package.json ./
              cp ${env.BACKUP_PATH}/package-lock.json ./
              echo "✅ Restored package files"
            fi
            
            npm install --legacy-peer-deps --prefer-offline
            sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
            
            pm2 start npm \
              --name "${PM2_APP_NAME}" \
              --interpreter node \
              --cwd ${DEPLOY_DIR} \
              --env NODE_ENV=production \
              -- run start
            
            pm2 save --force
            sleep 10
            
            if pm2 describe ${PM2_APP_NAME} | grep -q 'status.*online'; then
              echo "✅ Rollback successful"
            else
              echo "❌ Rollback failed - manual intervention required"
            fi
          """
        } else {
          echo '⚠️ No previous deployment - cannot rollback'
        }
        
        sh '''
          echo "Failed at: ${STAGE_NAME}"
          [ -f "${DEPLOY_DIR}/build.log" ] && tail -50 ${DEPLOY_DIR}/build.log || true
          pm2 logs ${PM2_APP_NAME} --nostream --lines 30 || true
        '''
      }
    }
    
    always {
      script {
        sh 'pm2 list'
        cleanWs(
          deleteDirs: true,
          patterns: [
            [pattern: '.git', type: 'INCLUDE'],
            [pattern: 'node_modules', type: 'INCLUDE'],
            [pattern: '.next', type: 'INCLUDE']
          ]
        )
      }
    }
  }
}

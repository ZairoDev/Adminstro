pipeline {
  agent any

  environment {
    NODE_VERSION = '18'
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
          
          // Create directories
          sh '''
            sudo mkdir -p ${DEPLOY_DIR}
            sudo mkdir -p ${BACKUP_DIR}
            sudo mkdir -p ${CACHE_DIR}
            sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
            sudo chown -R jenkins:jenkins ${BACKUP_DIR}
            sudo chown -R jenkins:jenkins ${CACHE_DIR}
          '''
          
          // Check if PM2 is installed
          sh '''
            if ! command -v pm2 &> /dev/null; then
              echo "Installing PM2..."
              sudo npm install -g pm2
            fi
            echo "PM2 version: $(pm2 -v)"
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

    stage('Backup .env.production') {
      steps {
        script {
          echo '💾 Backing up .env.production to safe location...'
          sh '''
            # Create temporary backup location
            mkdir -p /tmp/jenkins_env_backup
            
            # Backup .env.production if it exists
            if [ -f "${DEPLOY_DIR}/.env.production" ]; then
              cp ${DEPLOY_DIR}/.env.production /tmp/jenkins_env_backup/.env.production
              echo "✅ .env.production backed up to /tmp/jenkins_env_backup/"
            else
              echo "⚠️ No .env.production found - first deployment?"
            fi
          '''
        }
      }
    }

    stage('Backup Current Deployment') {
      when {
        expression { env.HAS_PREVIOUS_DEPLOYMENT == 'true' }
      }
      steps {
        script {
          echo '💾 Creating backup of current deployment...'
          sh """
            BACKUP_PATH=${BACKUP_DIR}/backup_${TIMESTAMP}
            mkdir -p \$BACKUP_PATH
            
            cd ${DEPLOY_DIR}
            
            # Backup build artifacts
            [ -d ".next" ] && cp -r .next \$BACKUP_PATH/ || true
            [ -f "package.json" ] && cp package.json \$BACKUP_PATH/ || true
            [ -f "package-lock.json" ] && cp package-lock.json \$BACKUP_PATH/ || true
            
            # Save PM2 state
            pm2 save --force
            [ -f ~/.pm2/dump.pm2 ] && cp ~/.pm2/dump.pm2 \$BACKUP_PATH/ || true
            
            echo \$BACKUP_PATH > /tmp/current_backup_path.txt
            
            # Keep only last 5 backups
            cd ${BACKUP_DIR}
            ls -t | tail -n +6 | xargs -r rm -rf
            
            echo "✅ Backup created at: \$BACKUP_PATH"
          """
          
          env.BACKUP_PATH = sh(script: "cat /tmp/current_backup_path.txt", returnStdout: true).trim()
        }
      }
    }

    stage('Checkout Code') {
      steps {
        script {
          echo '📦 Cloning repository...'
          try {
            checkout([
              $class: 'GitSCM',
              branches: [[name: "*/${BRANCH}"]],
              userRemoteConfigs: [[
                credentialsId: 'hostinger_ssh',
                url: "${REPO_URL}"
              ]],
              extensions: [
                [$class: 'CloneOption', depth: 1, noTags: false, shallow: true]
                // ✅ REMOVED: CleanBeforeCheckout - this was deleting .env.production
              ]
            ])
            
            sh '''
              echo "Current branch: $(git branch --show-current)"
              echo "Latest commit: $(git log -1 --oneline)"
            '''
          } catch (Exception e) {
            error("Failed to checkout code: ${e.message}")
          }
        }
      }
    }

    stage('Sync Code to Deploy Directory') {
      steps {
        script {
          echo '📁 Syncing code to deployment directory...'
          sh '''
            # Sync code while excluding sensitive files
            rsync -av --delete \
              --exclude=node_modules \
              --exclude=.next \
              --exclude=.git \
              --exclude=${BACKUP_DIR} \
              --exclude=.env.local \
              --exclude=.env.production \
              ./ ${DEPLOY_DIR}/
            
            sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
            echo "✅ Files synced to ${DEPLOY_DIR}"
          '''
        }
      }
    }

    stage('Restore .env.production') {
      steps {
        script {
          echo '🔐 Restoring .env.production...'
          sh '''
            # Restore .env.production from temporary backup
            if [ -f /tmp/jenkins_env_backup/.env.production ]; then
              cp /tmp/jenkins_env_backup/.env.production ${DEPLOY_DIR}/.env.production
              echo "✅ .env.production restored"
            else
              echo "❌ ERROR: .env.production not found in backup!"
              echo "Please create .env.production manually:"
              echo "  sudo nano ${DEPLOY_DIR}/.env.production"
              exit 1
            fi
            
            # Verify it exists
            if [ ! -f ${DEPLOY_DIR}/.env.production ]; then
              echo "❌ CRITICAL: .env.production missing after restore!"
              exit 1
            fi
            
            cd ${DEPLOY_DIR}
            echo "✅ Environment file verified"
            ls -la | grep env || true
          '''
        }
      }
    }

    stage('Setup Node.js') {
      steps {
        script {
          echo '⚙️ Setting up Node.js environment...'
          sh '''
            if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | sed 's/v//')" -lt "${NODE_VERSION}" ]; then
              echo "Installing Node.js ${NODE_VERSION}..."
              curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
              sudo apt-get install -y nodejs
            fi
            
            echo "Node version: $(node -v)"
            echo "NPM version: $(npm -v)"
            npm config set cache ${CACHE_DIR}
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
            
            # Check if we can reuse node_modules
            if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
              PACKAGE_HASH=$(cat package.json package-lock.json | md5sum | cut -d' ' -f1)
              if [ -f ".package-hash" ] && [ "$PACKAGE_HASH" = "$(cat .package-hash)" ]; then
                echo "✅ Using cached dependencies"
                npm install --save-dev @types/jsonwebtoken @types/node || true
                echo "$PACKAGE_HASH" > .package-hash
                exit 0
              fi
            fi
            
            # Fresh install
            echo "⚠️ Installing fresh dependencies..."
            rm -rf node_modules
            npm ci --prefer-offline --no-audit --cache ${CACHE_DIR} || npm install --prefer-offline --no-audit --cache ${CACHE_DIR}
            npm install --save-dev @types/jsonwebtoken @types/node || true
            
            # Save hash for next time
            cat package.json package-lock.json | md5sum | cut -d' ' -f1 > .package-hash
            
            echo "✅ Dependencies installed"
            echo "node_modules size: $(du -sh node_modules | cut -f1)"
          '''
        }
      }
    }

    stage('Build Project') {
      steps {
        script {
          echo '🏗️ Building Next.js project...'
          sh '''
            cd ${DEPLOY_DIR}
            
            rm -rf .next
            
            export NODE_ENV=production
            export NEXT_TELEMETRY_DISABLED=1
            
            echo "Starting Next.js build..."
            
            if ! npm run build 2>&1 | tee build.log; then
              echo "❌ Build failed"
              cat build.log
              exit 1
            fi
            
            # Verify build output
            if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
              echo "❌ Build incomplete"
              cat build.log
              exit 1
            fi
            
            echo "✅ Build completed successfully"
            echo "Build size: $(du -sh .next | cut -f1)"
          '''
        }
      }
    }

    stage('Deploy with PM2') {
      steps {
        script {
          echo '🚀 Deploying application with PM2...'
          sh """
            cd ${DEPLOY_DIR}
            
            # Stop existing instance
            if pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1; then
              pm2 stop ${PM2_APP_NAME}
              sleep 2
              pm2 delete ${PM2_APP_NAME}
            fi
            
            pm2 flush
            
            # Start application
            if [ -f "ecosystem.config.js" ]; then
              pm2 start ecosystem.config.js --env production
            else
              pm2 start npm \\
                --name "${PM2_APP_NAME}" \\
                --interpreter node \\
                --cwd ${DEPLOY_DIR} \\
                --time \\
                --env NODE_ENV=production \\
                -- run start
            fi
            
            pm2 save --force
            pm2 startup systemd -u jenkins --hp /var/lib/jenkins || true
            
            echo "Waiting for application to start..."
            sleep 10
          """
          
          // Verify deployment
          def pmStatus = sh(
            script: "pm2 describe ${PM2_APP_NAME} 2>&1 | grep -E 'status.*online' && echo 'success' || echo 'failed'",
            returnStdout: true
          ).trim()
          
          if (pmStatus.contains('failed')) {
            sh "pm2 logs ${PM2_APP_NAME} --nostream --lines 30"
            error("Application failed to start")
          }
          
          echo '✅ Application deployed and running'
        }
      }
    }

    stage('Health Check') {
      steps {
        script {
          echo '🏥 Running health check...'
          retry(5) {
            sleep(time: 5, unit: 'SECONDS')
            sh """
              if ! pm2 describe ${PM2_APP_NAME} | grep 'online' > /dev/null; then
                echo "❌ Application is not online"
                pm2 logs ${PM2_APP_NAME} --nostream --lines 20
                exit 1
              fi
              
              RESTART_COUNT=\$(pm2 describe ${PM2_APP_NAME} | grep 'restarts' | awk '{print \$NF}')
              if [ "\$RESTART_COUNT" -gt 2 ]; then
                echo "❌ Too many restarts: \$RESTART_COUNT"
                exit 1
              fi
              
              echo "✅ Health check passed"
            """
          }
        }
      }
    }

    stage('Cleanup') {
      steps {
        script {
          echo '🧹 Cleaning up...'
          sh '''
            # Clean old npm cache
            find ${CACHE_DIR} -type f -mtime +7 -delete 2>/dev/null || true
            
            # Clean old build logs
            find ${DEPLOY_DIR} -name "build.log.*" -mtime +7 -delete 2>/dev/null || true
            
            # Remove temporary env backup
            rm -rf /tmp/jenkins_env_backup
            
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
        sh """
          echo "========================================="
          echo "   DEPLOYMENT SUMMARY"
          echo "========================================="
          echo "Branch: ${env.BRANCH}"
          echo "Build: #${env.BUILD_NUMBER}"
          echo "Timestamp: ${env.TIMESTAMP}"
          echo "========================================="
          
          pm2 describe ${PM2_APP_NAME}
          pm2 logs ${PM2_APP_NAME} --lines 20 --nostream
        """
      }
    }
    
    failure {
      script {
        echo '❌❌❌ DEPLOYMENT FAILED! ❌❌❌'
        
        if (env.HAS_PREVIOUS_DEPLOYMENT == 'true' && env.BACKUP_PATH) {
          echo '🔄 Initiating rollback...'
          try {
            sh """
              cd ${DEPLOY_DIR}
              
              pm2 delete ${PM2_APP_NAME} || true
              pm2 flush
              
              # Restore previous build
              [ -d "${env.BACKUP_PATH}/.next" ] && rm -rf .next && cp -r ${env.BACKUP_PATH}/.next ./
              [ -f "${env.BACKUP_PATH}/package.json" ] && cp ${env.BACKUP_PATH}/package.json ./
              [ -f "${env.BACKUP_PATH}/package-lock.json" ] && cp ${env.BACKUP_PATH}/package-lock.json ./
              
              sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
              
              # Restart with old version
              pm2 start npm \\
                --name "${PM2_APP_NAME}" \\
                --interpreter node \\
                --cwd ${DEPLOY_DIR} \\
                --env NODE_ENV=production \\
                -- run start
              
              pm2 save --force
              sleep 10
              
              if pm2 describe ${PM2_APP_NAME} | grep 'online' > /dev/null; then
                echo "✅ Rollback successful"
              else
                echo "❌ Rollback failed - manual intervention required"
                exit 1
              fi
            """
          } catch (Exception e) {
            echo "❌ Rollback failed: ${e.message}"
            echo "🚨 MANUAL INTERVENTION REQUIRED!"
          }
        }
        
        // Show failure details
        sh """
          echo "========================================="
          echo "   FAILURE DETAILS"
          echo "========================================="
          [ -f "${DEPLOY_DIR}/build.log" ] && tail -n 50 ${DEPLOY_DIR}/build.log || true
          pm2 logs ${PM2_APP_NAME} --nostream --lines 30 || true
        """
      }
    }
    
    always {
      script {
        sh '''
          echo "========================================="
          echo "   FINAL STATUS"
          echo "========================================="
          pm2 list
        '''
        
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

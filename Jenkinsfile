pipeline {
  agent any

  environment {
    NODE_VERSION = '18'
    DEPLOY_DIR = '/var/www/adminstro'
    BACKUP_DIR = '/var/www/adminstro_backups'
    REPO_URL = 'https://github.com/ZairoDev/Adminstro.git'
    BRANCH = 'main'
    PM2_APP_NAME = 'adminstro'
    TIMESTAMP = sh(script: "date +%Y%m%d_%H%M%S", returnStdout: true).trim()
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
          
          // Check if PM2 is installed
          sh '''
            if ! command -v pm2 &> /dev/null; then
              echo "PM2 is not installed. Installing PM2 globally..."
              sudo npm install -g pm2
            fi
          '''
          
          // Create necessary directories
          sh '''
            sudo mkdir -p ${DEPLOY_DIR}
            sudo mkdir -p ${BACKUP_DIR}
          '''
          
          // Check if current deployment exists and is running
          env.HAS_PREVIOUS_DEPLOYMENT = sh(
            script: "[ -d '${DEPLOY_DIR}/.next' ] && echo 'true' || echo 'false'",
            returnStdout: true
          ).trim()
          
          echo "Previous deployment exists: ${env.HAS_PREVIOUS_DEPLOYMENT}"
        }
      }
    }

    stage('Backup Current Deployment') {
      when {
        expression { env.HAS_PREVIOUS_DEPLOYMENT == 'true' }
      }
      steps {
        script {
          echo "💾 Creating backup of current deployment..."
          sh """
            BACKUP_PATH=${BACKUP_DIR}/backup_${TIMESTAMP}
            sudo mkdir -p \$BACKUP_PATH
            sudo cp -r ${DEPLOY_DIR}/.next \$BACKUP_PATH/ || true
            sudo cp -r ${DEPLOY_DIR}/node_modules \$BACKUP_PATH/ || true
            sudo cp ${DEPLOY_DIR}/package.json \$BACKUP_PATH/ || true
            sudo cp ${DEPLOY_DIR}/package-lock.json \$BACKUP_PATH/ || true
            echo \$BACKUP_PATH > /tmp/current_backup_path.txt
            
            # Keep only last 5 backups
            cd ${BACKUP_DIR}
            sudo ls -t | tail -n +6 | xargs -r sudo rm -rf
          """
          
          env.BACKUP_PATH = sh(script: "cat /tmp/current_backup_path.txt", returnStdout: true).trim()
          echo "Backup created at: ${env.BACKUP_PATH}"
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
                credentialsId: 'github_token',
                url: "${REPO_URL}"
              ]],
              extensions: [
                [$class: 'CloneOption', depth: 1, noTags: false, shallow: true],
                [$class: 'CleanBeforeCheckout']
              ]
            ])
          } catch (Exception e) {
            error("Failed to checkout code: ${e.message}")
          }
        }
      }
    }

    stage('Setup Node.js') {
      steps {
        script {
          echo '⚙️ Verifying Node.js installation...'
          sh '''
            # Check if Node.js is already installed
            if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | sed 's/v//')" -lt "${NODE_VERSION}" ]; then
              echo "Installing Node.js ${NODE_VERSION}..."
              curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
              sudo apt-get install -y nodejs
            fi
            
            echo "Node version: $(node -v)"
            echo "NPM version: $(npm -v)"
          '''
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        script {
          echo '📁 Installing dependencies...'
          try {
            sh '''
              # Sync code to deployment directory
              sudo rsync -av --delete \
                --exclude=node_modules \
                --exclude=.next \
                --exclude=.git \
                --exclude=${BACKUP_DIR} \
                ./ ${DEPLOY_DIR}/
              
              cd ${DEPLOY_DIR}
              
              # Clean install dependencies
              sudo rm -rf node_modules package-lock.json
              sudo npm ci --prefer-offline --no-audit
            '''
          } catch (Exception e) {
            error("Dependency installation failed: ${e.message}")
          }
        }
      }
    }

    stage('Build Project') {
      steps {
        script {
          echo '🏗️ Building Next.js project...'
          try {
            sh """
              cd ${DEPLOY_DIR}
              
              # Remove old build
              sudo rm -rf .next
              
              # Build project
              sudo npm run build
              
              # Verify build was successful
              if [ ! -d ".next" ]; then
                echo "Build failed: .next directory not created"
                exit 1
              fi
            """
          } catch (Exception e) {
            error("Build failed: ${e.message}")
          }
        }
      }
    }

    stage('Health Check Before Restart') {
      when {
        expression { env.HAS_PREVIOUS_DEPLOYMENT == 'true' }
      }
      steps {
        script {
          echo '🏥 Performing health check on current deployment...'
          sh '''
            if pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1; then
              pm2 save --force
              echo "Current PM2 state saved"
            fi
          '''
        }
      }
    }

    stage('Deploy with PM2') {
      steps {
        script {
          echo '🚀 Deploying application with PM2...'
          try {
            sh """
              cd ${DEPLOY_DIR}
              
              if pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1; then
                echo "Restarting existing PM2 process..."
                pm2 restart ${PM2_APP_NAME} --update-env
              else
                echo "Starting new PM2 process..."
                pm2 start npm --name "${PM2_APP_NAME}" -- run start
              fi
              
              pm2 save --force
              
              # Wait for application to start
              sleep 5
            """
            
            // Verify deployment
            def pmStatus = sh(
              script: "pm2 describe ${PM2_APP_NAME} | grep 'status' | grep 'online' || echo 'failed'",
              returnStdout: true
            ).trim()
            
            if (pmStatus.contains('failed')) {
              error("Application failed to start properly")
            }
            
            echo '✅ Application is running'
          } catch (Exception e) {
            error("Deployment failed: ${e.message}")
          }
        }
      }
    }

    stage('Post-Deployment Health Check') {
      steps {
        script {
          echo '🏥 Running post-deployment health check...'
          retry(3) {
            sh """
              sleep 3
              
              # Check PM2 status
              if ! pm2 describe ${PM2_APP_NAME} | grep 'online' > /dev/null; then
                echo "Application is not online"
                exit 1
              fi
              
              # Optional: Add HTTP health check if you have a health endpoint
              # curl -f http://localhost:3000/api/health || exit 1
              
              echo "Health check passed"
            """
          }
        }
      }
    }
  }

  post {
    success {
      script {
        echo '✅ Deployment successful!'
        
        // Cleanup old backups on success
        sh """
          if [ -f /tmp/current_backup_path.txt ]; then
            rm -f /tmp/current_backup_path.txt
          fi
        """
        
        // Optional: Send success notification
        // slackSend color: 'good', message: "Deployment successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
      }
    }
    
    failure {
      script {
        echo '❌ Deployment failed! Initiating rollback...'
        
        if (env.HAS_PREVIOUS_DEPLOYMENT == 'true' && env.BACKUP_PATH) {
          try {
            sh """
              echo "Rolling back to backup: ${env.BACKUP_PATH}"
              
              cd ${DEPLOY_DIR}
              
              # Restore previous build
              if [ -d "${env.BACKUP_PATH}/.next" ]; then
                sudo rm -rf .next
                sudo cp -r ${env.BACKUP_PATH}/.next ./
              fi
              
              if [ -d "${env.BACKUP_PATH}/node_modules" ]; then
                sudo rm -rf node_modules
                sudo cp -r ${env.BACKUP_PATH}/node_modules ./
              fi
              
              if [ -f "${env.BACKUP_PATH}/package.json" ]; then
                sudo cp ${env.BACKUP_PATH}/package.json ./
              fi
              
              if [ -f "${env.BACKUP_PATH}/package-lock.json" ]; then
                sudo cp ${env.BACKUP_PATH}/package-lock.json ./
              fi
              
              # Restart with previous version
              if pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1; then
                pm2 restart ${PM2_APP_NAME}
              else
                pm2 start npm --name "${PM2_APP_NAME}" -- run start
              fi
              
              pm2 save --force
              
              echo "✅ Rollback completed successfully"
            """
            
            echo '✅ Successfully rolled back to previous deployment'
          } catch (Exception e) {
            echo "⚠️ Rollback failed: ${e.message}"
            echo "Manual intervention required!"
          }
        } else {
          echo '⚠️ No previous deployment found for rollback'
        }
        
        // Optional: Send failure notification
        // slackSend color: 'danger', message: "Deployment failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
      }
    }
    
    always {
      script {
        echo '🧹 Cleaning up workspace...'
        sh '''
          pm2 list
          pm2 logs ${PM2_APP_NAME} --lines 20 --nostream || true
        '''
        cleanWs(deleteDirs: true, patterns: [[pattern: 'node_modules', type: 'INCLUDE']])
      }
    }
  }
}

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
    PATH = "/usr/local/bin:/usr/bin:/bin:${env.PATH}"
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
            
            echo "PM2 version: $(pm2 -v)"
          '''
          
          // Create necessary directories with proper ownership
          sh '''
            sudo mkdir -p ${DEPLOY_DIR}
            sudo mkdir -p ${BACKUP_DIR}
            
            # Set proper ownership to jenkins user
            sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
            sudo chown -R jenkins:jenkins ${BACKUP_DIR}
          '''
          
          // Clean up duplicate PM2 processes
          sh '''
            PM2_INSTANCES=$(pm2 list | grep ${PM2_APP_NAME} | wc -l)
            if [ "$PM2_INSTANCES" -gt 1 ]; then
              echo "Found $PM2_INSTANCES instances of ${PM2_APP_NAME}. Cleaning up..."
              pm2 delete ${PM2_APP_NAME} || true
              pm2 save --force
            fi
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
            mkdir -p \$BACKUP_PATH
            
            # Backup critical files and directories
            if [ -d "${DEPLOY_DIR}/.next" ]; then
              cp -r ${DEPLOY_DIR}/.next \$BACKUP_PATH/ || true
            fi
            
            if [ -d "${DEPLOY_DIR}/node_modules" ]; then
              cp -r ${DEPLOY_DIR}/node_modules \$BACKUP_PATH/ || true
            fi
            
            if [ -f "${DEPLOY_DIR}/package.json" ]; then
              cp ${DEPLOY_DIR}/package.json \$BACKUP_PATH/ || true
            fi
            
            if [ -f "${DEPLOY_DIR}/package-lock.json" ]; then
              cp ${DEPLOY_DIR}/package-lock.json \$BACKUP_PATH/ || true
            fi
            
            echo \$BACKUP_PATH > /tmp/current_backup_path.txt
            
            # Keep only last 5 backups
            cd ${BACKUP_DIR}
            ls -t | tail -n +6 | xargs -r rm -rf
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
            echo "Node path: $(which node)"
            echo "NPM path: $(which npm)"
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
              rsync -av --delete \
                --exclude=node_modules \
                --exclude=.next \
                --exclude=.git \
                --exclude=${BACKUP_DIR} \
                ./ ${DEPLOY_DIR}/
              
              cd ${DEPLOY_DIR}
              
              # Ensure proper ownership
              chown -R jenkins:jenkins ${DEPLOY_DIR}
              
              # Remove old dependencies and lock file
              rm -rf node_modules package-lock.json
              
              # Install dependencies without sudo
              npm install --prefer-offline --no-audit
              
              # Verify installation
              if [ ! -d "node_modules" ]; then
                echo "node_modules directory was not created"
                exit 1
              fi
              
              echo "Dependencies installed successfully"
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
              rm -rf .next
              
              # Build project
              npm run build
              
              # Verify build was successful
              if [ ! -d ".next" ]; then
                echo "Build failed: .next directory not created"
                exit 1
              fi
              
              echo "Build completed successfully"
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
              
              # Stop and delete existing PM2 process(es)
              if pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1; then
                echo "Stopping existing PM2 process..."
                pm2 delete ${PM2_APP_NAME}
              fi
              
              # Start fresh PM2 process with explicit node path
              echo "Starting new PM2 process..."
              pm2 start npm \\
                --name "${PM2_APP_NAME}" \\
                --interpreter node \\
                --cwd ${DEPLOY_DIR} \\
                -- run start
              
              pm2 save --force
              
              # Wait for application to start
              sleep 5
            """
            
            // Verify deployment
            def pmStatus = sh(
              script: """
                pm2 describe ${PM2_APP_NAME} 2>&1 | grep -E 'status.*online' && echo 'success' || echo 'failed'
              """,
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
              
              # Check for errors in logs
              ERROR_COUNT=\$(pm2 logs ${PM2_APP_NAME} --nostream --lines 10 --err 2>&1 | grep -i "error\\|exception\\|not found" | wc -l)
              if [ "\$ERROR_COUNT" -gt 5 ]; then
                echo "Too many errors detected in logs"
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

    stage('Verify Single Instance') {
      steps {
        script {
          echo '🔍 Verifying single PM2 instance...'
          sh '''
            INSTANCE_COUNT=$(pm2 list | grep ${PM2_APP_NAME} | wc -l)
            if [ "$INSTANCE_COUNT" -ne 1 ]; then
              echo "Warning: Found $INSTANCE_COUNT instances instead of 1"
              pm2 list
            else
              echo "✅ Single instance verified"
            fi
          '''
        }
      }
    }
  }

  post {
    success {
      script {
        echo '✅ Deployment successful!'
        
        // Cleanup temporary files
        sh """
          if [ -f /tmp/current_backup_path.txt ]; then
            rm -f /tmp/current_backup_path.txt
          fi
        """
        
        // Show final status
        sh '''
          echo "=== Final PM2 Status ==="
          pm2 list
          pm2 logs ${PM2_APP_NAME} --lines 10 --nostream
        '''
        
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
              
              # Stop any running instances
              pm2 delete ${PM2_APP_NAME} || true
              
              # Restore previous build
              if [ -d "${env.BACKUP_PATH}/.next" ]; then
                rm -rf .next
                cp -r ${env.BACKUP_PATH}/.next ./
              fi
              
              if [ -d "${env.BACKUP_PATH}/node_modules" ]; then
                rm -rf node_modules
                cp -r ${env.BACKUP_PATH}/node_modules ./
              fi
              
              if [ -f "${env.BACKUP_PATH}/package.json" ]; then
                cp ${env.BACKUP_PATH}/package.json ./
              fi
              
              if [ -f "${env.BACKUP_PATH}/package-lock.json" ]; then
                cp ${env.BACKUP_PATH}/package-lock.json ./
              fi
              
              # Ensure proper ownership
              chown -R jenkins:jenkins ${DEPLOY_DIR}
              
              # Start with previous version
              pm2 start npm \\
                --name "${PM2_APP_NAME}" \\
                --interpreter node \\
                --cwd ${DEPLOY_DIR} \\
                -- run start
              
              pm2 save --force
              
              # Wait and verify
              sleep 5
              pm2 list
              
              echo "✅ Rollback completed successfully"
            """
            
            echo '✅ Successfully rolled back to previous deployment'
          } catch (Exception e) {
            echo "⚠️ Rollback failed: ${e.message}"
            echo "Manual intervention required!"
            
            // Try to at least get something running
            sh """
              cd ${DEPLOY_DIR}
              pm2 delete ${PM2_APP_NAME} || true
              pm2 resurrect || true
              pm2 list
            """ 
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
          echo "=== Final PM2 Status ==="
          pm2 list
          
          echo ""
          echo "=== Last 30 lines of logs ==="
          pm2 logs ${PM2_APP_NAME} --lines 30 --nostream || true
        '''
        
        // Clean workspace but keep node_modules for faster next build
        cleanWs(
          deleteDirs: true, 
          patterns: [
            [pattern: '.git', type: 'INCLUDE'],
            [pattern: '.next', type: 'INCLUDE']
          ]
        )
      }
    }
  }
}

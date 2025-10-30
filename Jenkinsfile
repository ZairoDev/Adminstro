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
   
    // Production environment variables
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
         
          // Check Git commit info
          env.GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
          env.GIT_COMMIT_MSG = sh(script: "git log -1 --pretty=%B", returnStdout: true).trim()
         
          echo "Deploying commit: ${env.GIT_COMMIT_SHORT}"
          echo "Commit message: ${env.GIT_COMMIT_MSG}"
         
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
            sudo mkdir -p ${CACHE_DIR}
           
            # Set proper ownership to jenkins user
            sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
            sudo chown -R jenkins:jenkins ${BACKUP_DIR}
            sudo chown -R jenkins:jenkins ${CACHE_DIR}
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
         
          // Check if current deployment exists
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
            cd ${DEPLOY_DIR}
           
            if [ -d ".next" ]; then
              echo "Backing up .next directory..."
              cp -r .next \$BACKUP_PATH/ || true
            fi
           
            if [ -f "package.json" ]; then
              cp package.json \$BACKUP_PATH/ || true
            fi
           
            if [ -f "package-lock.json" ]; then
              cp package-lock.json \$BACKUP_PATH/ || true
            fi
           
            if [ -f ".env.production" ]; then
              cp .env.production \$BACKUP_PATH/ || true
            fi
           
            # Store PM2 configuration
            pm2 save --force
            if [ -f ~/.pm2/dump.pm2 ]; then
              cp ~/.pm2/dump.pm2 \$BACKUP_PATH/ || true
            fi
           
            echo \$BACKUP_PATH > /tmp/current_backup_path.txt
           
            # Keep only last 5 backups
            cd ${BACKUP_DIR}
            ls -t | tail -n +6 | xargs -r rm -rf
           
            echo "Backup created at: \$BACKUP_PATH"
          """
         
          env.BACKUP_PATH = sh(script: "cat /tmp/current_backup_path.txt", returnStdout: true).trim()
          echo "✅ Backup created at: ${env.BACKUP_PATH}"
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
           
            // Verify checkout
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

    stage('Setup Node.js') {
      steps {
        script {
          echo '⚙️ Setting up Node.js environment...'
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
           
            # Set npm cache directory
            npm config set cache ${CACHE_DIR} --global
          '''
        }
      }
    }

    stage('Sync Code to Deploy Directory') {
      steps {
        script {
          echo '📁 Syncing code to deployment directory...'
          sh '''
            # Sync code to deployment directory, preserving node_modules if exists
            rsync -av --delete \
              --exclude=node_modules \
              --exclude=.next \
              --exclude=.git \
              --exclude=${BACKUP_DIR} \
              --exclude=.env.local \
		--exclude=.env.production \
              ./ ${DEPLOY_DIR}/
           
            # Ensure proper ownership
            sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
           
            cd ${DEPLOY_DIR}
            echo "Files synced to ${DEPLOY_DIR}"
            ls -la
          '''
        }
      }
    }

    stage('Check Dependencies Cache') {
      steps {
        script {
          echo '🔍 Checking dependencies cache...'
         
          sh '''
            cd ${DEPLOY_DIR}
           
            # Generate hash of package files
            PACKAGE_HASH=$(cat package.json package-lock.json 2>/dev/null | md5sum | cut -d' ' -f1)
            echo "Current package hash: $PACKAGE_HASH"
           
            # Check if we have cached dependencies with same hash
            if [ -f .package-hash ]; then
              CACHED_HASH=$(cat .package-hash)
              echo "Cached package hash: $CACHED_HASH"
             
              if [ "$PACKAGE_HASH" = "$CACHED_HASH" ] && [ -d "node_modules" ]; then
                echo "✅ Dependencies cache is valid, skipping npm install"
                echo "true" > .use-cache
              else
                echo "⚠️ Dependencies changed, will reinstall"
                echo "false" > .use-cache
              fi
            else
              echo "⚠️ No cache found, will install fresh"
              echo "false" > .use-cache
            fi
           
            # Save current hash
            echo "$PACKAGE_HASH" > .package-hash
          '''
         
          env.USE_CACHE = sh(
            script: "cat ${DEPLOY_DIR}/.use-cache",
            returnStdout: true
          ).trim()
        }
      }
    }

    stage('Install Dependencies') {
      when {
        expression { env.USE_CACHE != 'true' }
      }
      steps {
        script {
          echo '📦 Installing dependencies (cache miss)...'
          try {
            sh '''
              cd ${DEPLOY_DIR}
             
              # Clean install for fresh dependencies
              rm -rf node_modules
             
              # Install with cache and production optimizations
              npm ci --prefer-offline --no-audit --cache ${CACHE_DIR}
             
              # Verify installation
              if [ ! -d "node_modules" ]; then
                echo "❌ node_modules directory was not created"
                exit 1
              fi
             
              echo "✅ Dependencies installed successfully"
              echo "node_modules size: $(du -sh node_modules | cut -f1)"
            '''
          } catch (Exception e) {
            echo "⚠️ npm ci failed, trying npm install..."
            sh '''
              cd ${DEPLOY_DIR}
              rm -rf node_modules package-lock.json
              npm install --prefer-offline --no-audit --cache ${CACHE_DIR}
            '''
          }
        }
      }
    }

    stage('Verify Dependencies') {
      when {
        expression { env.USE_CACHE == 'true' }
      }
      steps {
        script {
          echo '✅ Using cached dependencies'
          sh '''
            cd ${DEPLOY_DIR}
            echo "node_modules size: $(du -sh node_modules | cut -f1)"
           
            # Quick verification that key packages exist
            if [ ! -d "node_modules/next" ]; then
              echo "⚠️ Cache corrupted, next package missing"
              exit 1
            fi
          '''
        }
      }
    }

    stage('Environment Variables Check') {
      steps {
        script {
          echo '🔐 Checking environment variables...'
          sh '''
            cd ${DEPLOY_DIR}
           
            # Check if .env.production exists
            if [ ! -f ".env.production" ]; then
              echo "⚠️ Warning: .env.production not found"
              echo "Creating from .env.example if available..."
              if [ -f ".env.example" ]; then
                cp .env.example .env.production
                echo "⚠️ Please update .env.production with actual values"
              fi
            else
              echo "✅ .env.production found"
              # Show variable names (not values) for verification
              echo "Available environment variables:"
              grep -v '^#' .env.production | grep '=' | cut -d'=' -f1 || true
            fi
          '''
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
             
              # Set production environment
              export NODE_ENV=production
              export NEXT_TELEMETRY_DISABLED=1
             
              # Build with verbose logging to catch errors
              echo "Starting Next.js build..."
              npm run build 2>&1 | tee build.log
             
              # Check build log for warnings/errors
              if grep -i "error" build.log | grep -v "0 errors"; then
                echo "⚠️ Build completed with errors"
                cat build.log
                exit 1
              fi
             
              # Verify build was successful
              if [ ! -d ".next" ]; then
                echo "❌ Build failed: .next directory not created"
                cat build.log
                exit 1
              fi
             
              # Check for standalone build (if configured)
              if [ -d ".next/standalone" ]; then
                echo "✅ Standalone build detected"
                ls -la .next/standalone
              fi
             
              echo "✅ Build completed successfully"
              echo "Build size: \$(du -sh .next | cut -f1)"
             
              # Show build summary
              if [ -f ".next/build-manifest.json" ]; then
                echo "Build manifest found"
              fi
            """
          } catch (Exception e) {
            sh """
              cd ${DEPLOY_DIR}
              echo "❌ Build failed with error: ${e.message}"
              echo "=== Last 50 lines of build log ==="
              tail -n 50 build.log || true
            """
            error("Build failed: ${e.message}")
          }
        }
      }
    }

    stage('Pre-Start Validation') {
      steps {
        script {
          echo '🔍 Validating build output...'
          sh '''
            cd ${DEPLOY_DIR}
           
            # Check for required Next.js files
            if [ ! -f ".next/BUILD_ID" ]; then
              echo "❌ BUILD_ID not found"
              exit 1
            fi
           
            BUILD_ID=$(cat .next/BUILD_ID)
            echo "Build ID: $BUILD_ID"
           
            # Check for server files
            if [ ! -d ".next/server" ]; then
              echo "❌ Server directory not found"
              exit 1
            fi
           
            echo "✅ Build validation passed"
          '''
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
              echo "Current application status:"
              pm2 describe ${PM2_APP_NAME}
             
              # Save current state
              pm2 save --force
              echo "✅ Current PM2 state saved"
            else
              echo "No running application found"
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
             
              # Stop existing PM2 process
              if pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1; then
                echo "Stopping existing PM2 process..."
                pm2 stop ${PM2_APP_NAME}
                sleep 2
                pm2 delete ${PM2_APP_NAME}
              fi
             
              # Clear PM2 logs
              pm2 flush
             
              # Start application with PM2 using ecosystem file or direct command
              if [ -f "ecosystem.config.js" ]; then
                echo "Starting with ecosystem.config.js..."
                pm2 start ecosystem.config.js --env production
              else
                echo "Starting with direct PM2 command..."
                pm2 start npm \\
                  --name "${PM2_APP_NAME}" \\
                  --interpreter node \\
                  --cwd ${DEPLOY_DIR} \\
                  --time \\
                  --env NODE_ENV=production \\
                  -- run start
              fi
             
              # Save PM2 process list
              pm2 save --force
             
              # Configure PM2 to start on system reboot
              pm2 startup systemd -u jenkins --hp /var/lib/jenkins || true
             
              # Wait for application to initialize
              echo "Waiting for application to start..."
              sleep 10
            """
           
            // Verify deployment
            def pmStatus = sh(
              script: """
                pm2 describe ${PM2_APP_NAME} 2>&1 | grep -E 'status.*online' && echo 'success' || echo 'failed'
              """,
              returnStdout: true
            ).trim()
           
            if (pmStatus.contains('failed')) {
              sh "pm2 logs ${PM2_APP_NAME} --nostream --lines 30"
              error("Application failed to start properly")
            }
           
            echo '✅ Application deployed and running'
          } catch (Exception e) {
            echo "❌ Deployment error: ${e.message}"
            sh "pm2 logs ${PM2_APP_NAME} --nostream --lines 50 || true"
            error("Deployment failed: ${e.message}")
          }
        }
      }
    }

    stage('Post-Deployment Health Check') {
      steps {
        script {
          echo '🏥 Running comprehensive health check...'
         
          // Retry health check up to 5 times
          retry(5) {
            sleep(time: 5, unit: 'SECONDS')
           
            sh """
              # Check PM2 status
              if ! pm2 describe ${PM2_APP_NAME} | grep 'online' > /dev/null; then
                echo "❌ Application is not online"
                pm2 logs ${PM2_APP_NAME} --nostream --lines 20
                exit 1
              fi
             
              # Check memory usage
              MEMORY_USAGE=\$(pm2 describe ${PM2_APP_NAME} | grep 'memory' | awk '{print \$NF}' | head -1)
              echo "Memory usage: \$MEMORY_USAGE"
             
              # Check for critical errors in logs
              ERROR_COUNT=\$(pm2 logs ${PM2_APP_NAME} --nostream --lines 50 --err 2>&1 | grep -iE "error|exception|fatal" | grep -v "0 errors" | wc -l)
              if [ "\$ERROR_COUNT" -gt 10 ]; then
                echo "⚠️ Warning: Detected \$ERROR_COUNT error messages in logs"
                pm2 logs ${PM2_APP_NAME} --nostream --lines 20 --err
              fi
             
              # Check restart count
              RESTART_COUNT=\$(pm2 describe ${PM2_APP_NAME} | grep 'restarts' | awk '{print \$NF}')
              echo "Restart count: \$RESTART_COUNT"
             
              if [ "\$RESTART_COUNT" -gt 2 ]; then
                echo "❌ Application restarted \$RESTART_COUNT times, likely unstable"
                exit 1
              fi
             
              echo "✅ Health check passed"
            """
          }
         
          // Optional: HTTP health check if you have a health endpoint
          // Make sure to uncomment and configure if needed
          /*
          sh '''
            # Wait a bit more for the app to be fully ready
            sleep 5
           
            # Check if app responds on localhost:3000
            if curl -f -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
              echo "✅ HTTP health check passed"
            else
              echo "⚠️ HTTP health check failed or returned non-200"
              exit 1
            fi
          '''
          */
        }
      }
    }

    stage('Verify Single Instance') {
      steps {
        script {
          echo '🔍 Verifying deployment integrity...'
          sh '''
            # Check for single instance
            INSTANCE_COUNT=$(pm2 list | grep ${PM2_APP_NAME} | wc -l)
            if [ "$INSTANCE_COUNT" -ne 1 ]; then
              echo "⚠️ Warning: Found $INSTANCE_COUNT instances instead of 1"
              pm2 list
            else
              echo "✅ Single instance verified"
            fi
           
            # Show final status
            echo "=== PM2 Status ==="
            pm2 list
           
            echo ""
            echo "=== Application Info ==="
            pm2 describe ${PM2_APP_NAME}
           
            echo ""
            echo "=== Recent Logs ==="
            pm2 logs ${PM2_APP_NAME} --nostream --lines 15
          '''
        }
      }
    }

    stage('Cleanup Old Builds') {
      steps {
        script {
          echo '🧹 Cleaning up old build artifacts...'
          sh '''
            cd ${DEPLOY_DIR}
           
            # Clean npm cache older than 7 days
            if [ -d "${CACHE_DIR}" ]; then
              find ${CACHE_DIR} -type f -mtime +7 -delete 2>/dev/null || true
              echo "Cleaned old npm cache"
            fi
           
            # Clean old build logs
            find ${DEPLOY_DIR} -name "build.log.*" -mtime +7 -delete 2>/dev/null || true
           
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
       
        // Cleanup temporary files
        sh """
          if [ -f /tmp/current_backup_path.txt ]; then
            rm -f /tmp/current_backup_path.txt
          fi
        """
       
        // Show deployment summary
        sh """
          echo ""
          echo "========================================="
          echo "   DEPLOYMENT SUMMARY"
          echo "========================================="
          echo "Commit: ${env.GIT_COMMIT_SHORT}"
          echo "Branch: ${env.BRANCH}"
          echo "Build: #${env.BUILD_NUMBER}"
          echo "Timestamp: ${env.TIMESTAMP}"
          echo "========================================="
          echo ""
         
          cd ${DEPLOY_DIR}
         
          echo "=== Application Status ==="
          pm2 describe ${PM2_APP_NAME}
         
          echo ""
          echo "=== Recent Logs ==="
          pm2 logs ${PM2_APP_NAME} --lines 20 --nostream
        """
       
        // Optional: Send success notification
        // slackSend(
        //   color: 'good',
        //   message: "✅ Deployment successful!\nJob: ${env.JOB_NAME}\nBuild: #${env.BUILD_NUMBER}\nCommit: ${env.GIT_COMMIT_SHORT}"
        // )
      }
    }
   
    failure {
      script {
        echo '❌❌❌ DEPLOYMENT FAILED! ❌❌❌'
        echo 'Initiating automatic rollback...'
       
        if (env.HAS_PREVIOUS_DEPLOYMENT == 'true' && env.BACKUP_PATH) {
          try {
            sh """
              echo "🔄 Rolling back to: ${env.BACKUP_PATH}"
             
              cd ${DEPLOY_DIR}
             
              # Stop any running instances
              pm2 delete ${PM2_APP_NAME} || true
              pm2 flush
             
              # Restore previous build
              if [ -d "${env.BACKUP_PATH}/.next" ]; then
                echo "Restoring .next directory..."
                rm -rf .next
                cp -r ${env.BACKUP_PATH}/.next ./
              fi
             
              if [ -f "${env.BACKUP_PATH}/package.json" ]; then
                echo "Restoring package.json..."
                cp ${env.BACKUP_PATH}/package.json ./
              fi
             
              if [ -f "${env.BACKUP_PATH}/package-lock.json" ]; then
                echo "Restoring package-lock.json..."
                cp ${env.BACKUP_PATH}/package-lock.json ./
              fi
             
              if [ -f "${env.BACKUP_PATH}/.env.production" ]; then
                echo "Restoring .env.production..."
                cp ${env.BACKUP_PATH}/.env.production ./
              fi
             
              # Restore PM2 configuration if available
              if [ -f "${env.BACKUP_PATH}/dump.pm2" ]; then
                cp ${env.BACKUP_PATH}/dump.pm2 ~/.pm2/
              fi
             
              # Ensure proper ownership
              sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
             
              # Start with previous version
              pm2 start npm \\
                --name "${PM2_APP_NAME}" \\
                --interpreter node \\
                --cwd ${DEPLOY_DIR} \\
                --env NODE_ENV=production \\
                -- run start
             
              pm2 save --force
             
              # Wait and verify rollback
              sleep 10
             
              if pm2 describe ${PM2_APP_NAME} | grep 'online' > /dev/null; then
                echo "✅ Rollback completed successfully"
                pm2 list
                pm2 logs ${PM2_APP_NAME} --nostream --lines 20
              else
                echo "❌ Rollback verification failed"
                pm2 list
                exit 1
              fi
            """
           
            echo '✅ Successfully rolled back to previous deployment'
          } catch (Exception e) {
            echo "❌ Rollback failed: ${e.message}"
            echo "🚨 MANUAL INTERVENTION REQUIRED! 🚨"
           
            // Try PM2 resurrect as last resort
            sh """
              cd ${DEPLOY_DIR}
              pm2 delete ${PM2_APP_NAME} || true
              pm2 resurrect || true
              pm2 list
             
              echo ""
              echo "========================================="
              echo "  MANUAL RECOVERY STEPS:"
              echo "========================================="
              echo "1. SSH into the server"
              echo "2. cd ${DEPLOY_DIR}"
              echo "3. Check logs: pm2 logs ${PM2_APP_NAME}"
              echo "4. Try manual start: pm2 start npm --name ${PM2_APP_NAME} -- run start"
              echo "5. Contact DevOps team if issues persist"
              echo "========================================="
            """
          }
        } else {
          echo '⚠️ No previous deployment found for rollback'
          echo 'Manual intervention required to restore service'
        }
       
        // Show error logs
        sh """
          echo ""
          echo "========================================="
          echo "   FAILURE DETAILS"
          echo "========================================="
          echo "Build: #${env.BUILD_NUMBER}"
          echo "Stage: ${env.STAGE_NAME}"
          echo "========================================="
         
          cd ${DEPLOY_DIR}
         
          if [ -f "build.log" ]; then
            echo ""
            echo "=== Build Log (last 50 lines) ==="
            tail -n 50 build.log
          fi
         
          echo ""
          echo "=== PM2 Logs ==="
          pm2 logs ${PM2_APP_NAME} --nostream --lines 30 || true
        """
       
        // Optional: Send failure notification
        // slackSend(
        //   color: 'danger',
        //   message: "❌ Deployment failed!\nJob: ${env.JOB_NAME}\nBuild: #${env.BUILD_NUMBER}\nCommit: ${env.GIT_COMMIT_SHORT}\nStage: ${env.STAGE_NAME}"
        // )
      }
    }
   
    always {
      script {
        echo '🧹 Final cleanup and status report...'
        sh '''
          echo ""
          echo "========================================="
          echo "   FINAL STATUS"
          echo "========================================="
          pm2 list
         
          echo ""
          echo "=== System Resources ==="
          echo "Memory usage:"
          free -h
          echo ""
          echo "Disk usage:"
          df -h ${DEPLOY_DIR}
         
          echo ""
          echo "=== Cache Status ==="
          if [ -d "${CACHE_DIR}" ]; then
            echo "NPM cache size: $(du -sh ${CACHE_DIR} | cut -f1)"
          fi
         
          echo "========================================="
        '''
       
        // Clean workspace but preserve cache
        cleanWs(
          deleteDirs: true,
          patterns: [
            [pattern: '.git', type: 'INCLUDE'],
            [pattern: 'node_modules', type: 'INCLUDE'],
            [pattern: '.next', type: 'INCLUDE'],
            [pattern: 'build.log', type: 'INCLUDE']
          ]
        )
      }
    }
  }
}

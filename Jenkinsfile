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
            # Create directories with proper permissions
            sudo mkdir -p ${DEPLOY_DIR}
            sudo mkdir -p ${BACKUP_DIR}
            sudo mkdir -p ${CACHE_DIR}
            sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
            sudo chown -R jenkins:jenkins ${BACKUP_DIR}
            sudo chown -R jenkins:jenkins ${CACHE_DIR}
          '''
          
          sh '''
            # Verify PM2 installation
            if ! command -v pm2 &> /dev/null; then
              echo "Installing PM2 globally..."
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

    stage('Backup Environment & Current Deployment') {
      steps {
        script {
          echo '💾 Creating backups...'
          sh '''
            # Backup .env.production
            mkdir -p /tmp/jenkins_env_backup
            if [ -f "${DEPLOY_DIR}/.env.production" ]; then
              cp ${DEPLOY_DIR}/.env.production /tmp/jenkins_env_backup/.env.production
              echo "✅ .env.production backed up"
            else
              echo "⚠️ No .env.production found - first deployment?"
            fi
          '''
          
          // Backup current deployment if exists
          if (env.HAS_PREVIOUS_DEPLOYMENT == 'true') {
            sh """
              BACKUP_PATH=${BACKUP_DIR}/backup_${TIMESTAMP}
              mkdir -p \$BACKUP_PATH
              
              cd ${DEPLOY_DIR}
              
              # Backup critical files and build artifacts
              [ -d ".next" ] && cp -r .next \$BACKUP_PATH/ || true
              [ -f "package.json" ] && cp package.json \$BACKUP_PATH/ || true
              [ -f "package-lock.json" ] && cp package-lock.json \$BACKUP_PATH/ || true
              [ -d "node_modules" ] && echo "Skipping node_modules backup (too large)" || true
              
              # Save PM2 state
              pm2 save --force || true
              
              echo \$BACKUP_PATH > /tmp/current_backup_path.txt
              
              # Keep only last 5 backups
              cd ${BACKUP_DIR}
              ls -t | tail -n +6 | xargs -r rm -rf
              
              echo "✅ Backup created at: \$BACKUP_PATH"
            """
            
            env.BACKUP_PATH = sh(script: "cat /tmp/current_backup_path.txt 2>/dev/null || echo ''", returnStdout: true).trim()
          }
        }
      }
    }

    stage('Checkout Code') {
      steps {
        script {
          echo '📦 Checking out latest code from repository...'
          
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
            echo "========================================="
            echo "📋 Git Repository Information"
            echo "========================================="
            echo "Branch: $(git branch --show-current)"
            echo "Commit: $(git log -1 --oneline)"
            echo "Author: $(git log -1 --format='%an <%ae>')"
            echo ""
            
            echo "========================================="
            echo "📦 Verifying package.json in workspace"
            echo "========================================="
            if [ -f "package.json" ]; then
              echo "✅ package.json found"
              echo "Workspace: $(pwd)"
              echo "MD5: $(md5sum package.json | cut -d' ' -f1)"
            else
              echo "❌ package.json NOT FOUND!"
              exit 1
            fi
          '''
        }
      }
    }

    stage('Sync Code to Deploy Directory') {
      steps {
        script {
          echo '📁 Syncing code to deployment directory...'
          sh '''
            echo "Syncing from: $(pwd)"
            echo "Syncing to: ${DEPLOY_DIR}"
            
            # Use rsync to sync files, preserving what should be preserved
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
            
            echo ""
            echo "========================================="
            echo "🔍 Verifying synced files in deploy directory"
            echo "========================================="
            cd ${DEPLOY_DIR}
            
            if [ -f "package.json" ]; then
              echo "✅ package.json synced successfully"
              echo "Deploy Dir: $(pwd)"
              echo "MD5: $(md5sum package.json | cut -d' ' -f1)"
            else
              echo "❌ package.json NOT FOUND in deploy directory!"
              exit 1
            fi
            
            if [ -f "package-lock.json" ]; then
              echo "✅ package-lock.json present"
            else
              echo "⚠️ package-lock.json not found (will be generated)"
            fi
            
            echo "✅ Files synced to ${DEPLOY_DIR}"
          '''
        }
      }
    }

    stage('Restore Environment File') {
      steps {
        script {
          echo '🔐 Restoring .env.production...'
          sh '''
            if [ -f /tmp/jenkins_env_backup/.env.production ]; then
              cp /tmp/jenkins_env_backup/.env.production ${DEPLOY_DIR}/.env.production
              sudo chown jenkins:jenkins ${DEPLOY_DIR}/.env.production
              echo "✅ .env.production restored"
            else
              echo "❌ ERROR: .env.production not found in backup!"
              echo "CRITICAL: Application cannot run without environment variables"
              echo "Please create .env.production manually at: ${DEPLOY_DIR}/.env.production"
              exit 1
            fi
            
            # Verify
            if [ ! -f ${DEPLOY_DIR}/.env.production ]; then
              echo "❌ CRITICAL: .env.production missing after restore!"
              exit 1
            fi
          '''
        }
      }
    }

    stage('Setup Node.js Environment') {
      steps {
        script {
          echo '⚙️ Setting up Node.js environment...'
          sh '''
            # Check Node.js version
            if command -v node &> /dev/null; then
              CURRENT_NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
              echo "Current Node.js version: v${CURRENT_NODE_VERSION}"
              
              if [ "$CURRENT_NODE_VERSION" -lt "${NODE_VERSION}" ]; then
                echo "⚠️ Node.js version is outdated, updating..."
                curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
                sudo apt-get install -y nodejs
              fi
            else
              echo "Installing Node.js ${NODE_VERSION}.x..."
              curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
              sudo apt-get install -y nodejs
            fi
            
            echo ""
            echo "========================================="
            echo "📋 Environment Versions"
            echo "========================================="
            echo "Node.js: $(node -v)"
            echo "NPM: $(npm -v)"
            echo "PM2: $(pm2 -v)"
            
            # Configure npm cache
            npm config set cache ${CACHE_DIR}
            echo "NPM cache: ${CACHE_DIR}"
          '''
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        script {
          echo '📦 Installing Node.js dependencies...'
          sh '''
            cd ${DEPLOY_DIR}
            
            echo "========================================="
            echo "🧹 Cleaning previous installation"
            echo "========================================="
            
            # Remove only node_modules, keep package files from Git
            rm -rf node_modules
            
            # Clean npm cache (but don't remove everything)
            npm cache verify || npm cache clean --force
            
            echo ""
            echo "========================================="
            echo "📋 Pre-installation verification"
            echo "========================================="
            echo "Current directory: $(pwd)"
            echo ""
            
            if [ -f "package.json" ]; then
              echo "✅ package.json exists"
              echo "Checking devDependencies..."
              grep -A 15 '"devDependencies"' package.json | head -20
            else
              echo "❌ package.json NOT FOUND!"
              exit 1
            fi
            
            echo ""
            echo "========================================="
            echo "📦 Installing dependencies"
            echo "========================================="
            
            # First, try npm ci if package-lock.json exists
            if [ -f "package-lock.json" ]; then
              echo "Using npm ci for deterministic installation..."
              if npm ci --legacy-peer-deps --cache ${CACHE_DIR}; then
                echo "✅ npm ci succeeded"
              else
                echo "⚠️ npm ci failed, falling back to npm install..."
                rm -f package-lock.json
                npm install --legacy-peer-deps --cache ${CACHE_DIR}
              fi
            else
              echo "No package-lock.json found, using npm install..."
              npm install --legacy-peer-deps --cache ${CACHE_DIR}
            fi
            
            echo ""
            echo "========================================="
            echo "🔍 Verifying critical packages"
            echo "========================================="
            
            MISSING_PACKAGES=""
            
            # Check for critical type definitions
            if [ ! -d "node_modules/@types/jsonwebtoken" ]; then
              echo "❌ @types/jsonwebtoken is MISSING"
              MISSING_PACKAGES="$MISSING_PACKAGES @types/jsonwebtoken"
            else
              echo "✅ @types/jsonwebtoken installed"
            fi
            
            if [ ! -d "node_modules/@types/node" ]; then
              echo "❌ @types/node is MISSING"
              MISSING_PACKAGES="$MISSING_PACKAGES @types/node"
            else
              echo "✅ @types/node installed"
            fi
            
            if [ ! -d "node_modules/typescript" ]; then
              echo "❌ typescript is MISSING"
              MISSING_PACKAGES="$MISSING_PACKAGES typescript"
            else
              echo "✅ typescript installed"
            fi
            
            if [ ! -d "node_modules/eslint-config-next" ]; then
              echo "❌ eslint-config-next is MISSING"
              MISSING_PACKAGES="$MISSING_PACKAGES eslint-config-next"
            else
              echo "✅ eslint-config-next installed"
            fi
            
            # If packages are missing, try to install them explicitly
            if [ -n "$MISSING_PACKAGES" ]; then
              echo ""
              echo "⚠️ Attempting to install missing packages..."
              npm install --save-dev $MISSING_PACKAGES --legacy-peer-deps || {
                echo "❌ Failed to install missing packages!"
                echo "This indicates a problem with your package.json"
                exit 1
              }
            fi
            
            echo ""
            echo "========================================="
            echo "✅ Dependencies installation completed"
            echo "========================================="
            echo "node_modules size: $(du -sh node_modules 2>/dev/null | cut -f1)"
            echo ""
            echo "Installed @types packages:"
            ls -1 node_modules/@types/ 2>/dev/null | head -10 || echo "None found"
          '''
        }
      }
    }

    stage('Build Application') {
      steps {
        script {
          echo '🏗️ Building Next.js application...'
          sh '''
            cd ${DEPLOY_DIR}
            
            echo "========================================="
            echo "🔍 Pre-build verification"
            echo "========================================="
            
            # Verify TypeScript and build tools
            echo "TypeScript: $(npx tsc --version 2>/dev/null || echo 'NOT FOUND')"
            echo "Next.js: $(npm list next --depth=0 2>/dev/null | grep next || echo 'NOT FOUND')"
            
            # Check for configuration files
            [ -f "tsconfig.json" ] && echo "✅ tsconfig.json exists" || echo "⚠️ tsconfig.json missing"
            [ -f "next.config.js" ] && echo "✅ next.config.js exists" || [ -f "next.config.mjs" ] && echo "✅ next.config.mjs exists" || echo "⚠️ next.config missing"
            [ -f ".eslintrc.json" ] && echo "✅ .eslintrc.json exists" || echo "⚠️ .eslintrc.json missing"
            
            echo ""
            echo "========================================="
            echo "🏗️ Starting build process"
            echo "========================================="
            
            # Remove old build
            rm -rf .next
            
            # Set production environment
            export NODE_ENV=production
            export NEXT_TELEMETRY_DISABLED=1
            
            # Run build with error capture
            if npm run build 2>&1 | tee build.log; then
              echo ""
              echo "✅ Build command completed"
            else
              BUILD_EXIT_CODE=$?
              echo ""
              echo "========================================="
              echo "❌ BUILD FAILED (Exit code: $BUILD_EXIT_CODE)"
              echo "========================================="
              echo ""
              echo "Last 50 lines of build log:"
              tail -n 50 build.log
              exit 1
            fi
            
            # Verify build output
            echo ""
            echo "========================================="
            echo "🔍 Verifying build output"
            echo "========================================="
            
            if [ ! -d ".next" ]; then
              echo "❌ .next directory not found!"
              exit 1
            fi
            
            if [ ! -f ".next/BUILD_ID" ]; then
              echo "❌ BUILD_ID file not found!"
              exit 1
            fi
            
            echo "✅ Build verification passed"
            echo "BUILD_ID: $(cat .next/BUILD_ID)"
            echo "Build size: $(du -sh .next | cut -f1)"
            
            # Check for build warnings
            if grep -i "warn" build.log > /dev/null; then
              echo ""
              echo "⚠️ Build completed with warnings:"
              grep -i "warn" build.log | tail -10
            fi
            
            echo ""
            echo "========================================="
            echo "✅ Build completed successfully"
            echo "========================================="
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
            
            echo "========================================="
            echo "🛑 Stopping old application instance"
            echo "========================================="
            
            # Stop and delete existing instance
            if pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1; then
              echo "Stopping ${PM2_APP_NAME}..."
              pm2 stop ${PM2_APP_NAME} || true
              sleep 2
              pm2 delete ${PM2_APP_NAME} || true
              echo "✅ Old instance removed"
            else
              echo "No existing instance found"
            fi
            
            # Clear PM2 logs
            pm2 flush
            
            echo ""
            echo "========================================="
            echo "🚀 Starting new application instance"
            echo "========================================="
            
            # Start application
            if [ -f "ecosystem.config.js" ]; then
              echo "Using ecosystem.config.js..."
              pm2 start ecosystem.config.js --env production
            else
              echo "Starting with npm..."
              pm2 start npm \\
                --name "${PM2_APP_NAME}" \\
                --interpreter node \\
                --cwd ${DEPLOY_DIR} \\
                --time \\
                --env NODE_ENV=production \\
                --max-memory-restart 500M \\
                --exp-backoff-restart-delay=100 \\
                -- run start
            fi
            
            # Save PM2 configuration
            pm2 save --force
            
            # Setup PM2 to start on system boot
            pm2 startup systemd -u jenkins --hp /var/lib/jenkins || true
            
            echo ""
            echo "⏳ Waiting for application to initialize..."
            sleep 10
            
            echo ""
            echo "========================================="
            echo "🔍 Verifying deployment"
            echo "========================================="
            
            if pm2 describe ${PM2_APP_NAME} 2>&1 | grep -q 'status.*online'; then
              echo "✅ Application is ONLINE"
              pm2 describe ${PM2_APP_NAME} | grep -E 'status|uptime|restarts'
            else
              echo "❌ Application failed to start!"
              echo ""
              echo "PM2 Status:"
              pm2 list
              echo ""
              echo "Recent logs:"
              pm2 logs ${PM2_APP_NAME} --nostream --lines 30
              exit 1
            fi
          """
        }
      }
    }

    stage('Health Check') {
      steps {
        script {
          echo '🏥 Running health checks...'
          
          retry(5) {
            sleep(time: 5, unit: 'SECONDS')
            
            sh """
              echo "Health check attempt..."
              
              # Check if application is online
              if ! pm2 describe ${PM2_APP_NAME} | grep -q 'status.*online'; then
                echo "❌ Application is not online"
                pm2 logs ${PM2_APP_NAME} --nostream --lines 20
                exit 1
              fi
              
              # Check restart count
              RESTART_COUNT=\$(pm2 describe ${PM2_APP_NAME} | grep 'restarts' | awk '{print \$NF}' | grep -o '[0-9]*')
              if [ "\$RESTART_COUNT" -gt 2 ]; then
                echo "❌ Too many restarts: \$RESTART_COUNT"
                pm2 logs ${PM2_APP_NAME} --nostream --lines 30
                exit 1
              fi
              
              # Check memory usage
              MEMORY=\$(pm2 describe ${PM2_APP_NAME} | grep 'memory' | awk '{print \$NF}')
              echo "Memory usage: \$MEMORY"
              
              echo "✅ Health check passed"
            """
          }
          
          echo '✅ All health checks passed'
        }
      }
    }

    stage('Cleanup') {
      steps {
        script {
          echo '🧹 Performing cleanup...'
          sh '''
            # Clean old npm cache (files older than 7 days)
            find ${CACHE_DIR} -type f -mtime +7 -delete 2>/dev/null || true
            
            # Clean old build logs
            find ${DEPLOY_DIR} -name "build.log*" -mtime +7 -delete 2>/dev/null || true
            
            # Remove temporary files
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
        echo ''
        echo '✅✅✅ DEPLOYMENT SUCCESSFUL! ✅✅✅'
        echo ''
        
        sh """
          echo "========================================="
          echo "   DEPLOYMENT SUMMARY"
          echo "========================================="
          echo "Job: ${env.JOB_NAME}"
          echo "Build: #${env.BUILD_NUMBER}"
          echo "Branch: ${env.BRANCH}"
          echo "Timestamp: ${env.TIMESTAMP}"
          echo "Node.js: \$(node -v)"
          echo "========================================="
          echo ""
          
          echo "PM2 Application Status:"
          pm2 describe ${PM2_APP_NAME}
          
          echo ""
          echo "Recent Application Logs:"
          pm2 logs ${PM2_APP_NAME} --lines 20 --nostream
        """
      }
    }
    
    failure {
      script {
        echo ''
        echo '❌❌❌ DEPLOYMENT FAILED! ❌❌❌'
        echo ''
        
        // Attempt rollback if previous deployment exists
        if (env.HAS_PREVIOUS_DEPLOYMENT == 'true' && env.BACKUP_PATH) {
          echo '🔄 Initiating automatic rollback...'
          
          try {
            sh """
              cd ${DEPLOY_DIR}
              
              echo "========================================="
              echo "Rolling back to previous version..."
              echo "========================================="
              
              # Stop failed deployment
              pm2 delete ${PM2_APP_NAME} || true
              pm2 flush
              
              # Restore previous build artifacts
              if [ -d "${env.BACKUP_PATH}/.next" ]; then
                rm -rf .next
                cp -r ${env.BACKUP_PATH}/.next ./
                echo "✅ Restored .next directory"
              fi
              
              if [ -f "${env.BACKUP_PATH}/package.json" ]; then
                cp ${env.BACKUP_PATH}/package.json ./
                echo "✅ Restored package.json"
              fi
              
              if [ -f "${env.BACKUP_PATH}/package-lock.json" ]; then
                cp ${env.BACKUP_PATH}/package-lock.json ./
                echo "✅ Restored package-lock.json"
              fi
              
              # Reinstall dependencies from backup package.json
              npm install --legacy-peer-deps --prefer-offline
              
              # Ensure proper ownership
              sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
              
              # Restart with previous version
              pm2 start npm \\
                --name "${PM2_APP_NAME}" \\
                --interpreter node \\
                --cwd ${DEPLOY_DIR} \\
                --env NODE_ENV=production \\
                -- run start
              
              pm2 save --force
              sleep 10
              
              # Verify rollback
              if pm2 describe ${PM2_APP_NAME} | grep -q 'status.*online'; then
                echo ""
                echo "========================================="
                echo "✅ ROLLBACK SUCCESSFUL"
                echo "========================================="
                echo "Application restored to previous working version"
              else
                echo ""
                echo "========================================="
                echo "❌ ROLLBACK FAILED"
                echo "========================================="
                echo "Manual intervention required!"
                exit 1
              fi
            """
          } catch (Exception e) {
            echo "❌ Rollback failed: ${e.message}"
            echo "🚨 CRITICAL: Manual intervention required!"
            echo "Contact DevOps team immediately"
          }
        } else {
          echo '⚠️ No previous deployment found - cannot rollback'
          echo '🚨 Manual intervention required'
        }
        
        // Show detailed failure information
        sh """
          echo ""
          echo "========================================="
          echo "   FAILURE DETAILS"
          echo "========================================="
          echo "Failed Stage: ${env.STAGE_NAME}"
          echo "Build Number: #${env.BUILD_NUMBER}"
          echo "Timestamp: ${env.TIMESTAMP}"
          echo "========================================="
          echo ""
          
          # Show build logs if available
          if [ -f "${DEPLOY_DIR}/build.log" ]; then
            echo "Last 100 lines of build log:"
            echo "========================================="
            tail -n 100 ${DEPLOY_DIR}/build.log
            echo ""
          fi
          
          # Show PM2 status and logs
          echo "PM2 Status:"
          echo "========================================="
          pm2 list
          echo ""
          
          echo "PM2 Logs (last 50 lines):"
          echo "========================================="
          pm2 logs ${PM2_APP_NAME} --nostream --lines 50 || echo "No logs available"
        """
      }
    }
    
    always {
      script {
        sh '''
          echo ""
          echo "========================================="
          echo "   FINAL PM2 STATUS"
          echo "========================================="
          pm2 list
          echo ""
        '''
        
        // Clean Jenkins workspace
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

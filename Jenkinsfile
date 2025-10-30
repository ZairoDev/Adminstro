pipeline {
  agent any
  
  environment {
    PM2_APP_NAME = 'adminstro'
    DEPLOY_DIR = '/var/www/adminstro'
    NODE_ENV = 'production'
  }
  
  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }
  
  stages {
    stage('Pre-flight Checks') {
      steps {
        script {
          echo '🔍 Running pre-flight checks...'
          sh '''
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "📊 SYSTEM INFORMATION"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "Node version: $(node --version)"
            echo "NPM version: $(npm --version)"
            echo "PM2 version: $(pm2 --version)"
            echo "Current user: $(whoami)"
            echo "Working directory: $(pwd)"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            echo ""
            echo "📁 Checking deployment directory..."
            if [ -d "${DEPLOY_DIR}" ]; then
              echo "✅ Deploy directory exists: ${DEPLOY_DIR}"
              echo "Directory permissions: $(ls -ld ${DEPLOY_DIR})"
            else
              echo "⚠️ Deploy directory does not exist, will be created"
              mkdir -p ${DEPLOY_DIR}
              echo "✅ Created: ${DEPLOY_DIR}"
            fi
            
            echo ""
            echo "💾 Disk space check:"
            df -h ${DEPLOY_DIR}
            
            echo ""
            echo "🔧 PM2 current status:"
            pm2 list || echo "No PM2 processes running"
            
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          '''
        }
      }
    }
    
    stage('Checkout') {
      steps {
        script {
          echo '📦 Checking out code from GitHub...'
          sh 'echo "Repository: https://github.com/ZairoDev/Adminstro.git"'
          sh 'echo "Branch: main"'
          
          git branch: 'main',
              credentialsId: 'hostinger_ssh',
              url: 'https://github.com/ZairoDev/Adminstro.git'
          
          sh '''
            echo ""
            echo "✅ Code checked out successfully"
            echo "Current commit:"
            git log -1 --oneline
            echo ""
            echo "Files in workspace:"
            ls -lah $WORKSPACE | head -20
            echo ""
            echo "Checking critical files..."
            
            if [ -f "$WORKSPACE/package.json" ]; then
              echo "✅ package.json found"
            else
              echo "❌ ERROR: package.json NOT FOUND!"
              exit 1
            fi
            
            if [ -f "$WORKSPACE/next.config.mjs" ]; then
              echo "✅ next.config.mjs found"
            else
              echo "⚠️ WARNING: next.config.mjs not found"
            fi
          '''
        }
      }
    }
    
    stage('Sync Files') {
      steps {
        script {
          echo '📁 Syncing files to deployment directory...'
          sh '''
            echo "Source: $WORKSPACE"
            echo "Destination: ${DEPLOY_DIR}"
            echo ""
            
            echo "Starting rsync..."
            rsync -av --delete \
              --exclude=node_modules \
              --exclude=.next \
              --exclude=.git \
              --exclude=.env.local \
              $WORKSPACE/ ${DEPLOY_DIR}/ 2>&1 | tail -20
            
            RSYNC_EXIT_CODE=$?
            if [ $RSYNC_EXIT_CODE -ne 0 ]; then
              echo "❌ ERROR: rsync failed with exit code $RSYNC_EXIT_CODE"
              exit $RSYNC_EXIT_CODE
            fi
            
            echo ""
            echo "✅ Files synced successfully"
            echo "Files in deploy directory:"
            ls -lah ${DEPLOY_DIR} | head -20
            
            echo ""
            echo "Verifying critical files in deployment directory..."
            cd ${DEPLOY_DIR}
            
            if [ -f "package.json" ]; then
              echo "✅ package.json present"
              echo "Package name: $(cat package.json | grep '"name"' | head -1)"
            else
              echo "❌ ERROR: package.json missing after sync!"
              exit 1
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
            
            echo "Current directory: $(pwd)"
            echo ""
            
            # Check if package-lock.json exists
            if [ -f "package-lock.json" ]; then
              echo "📄 package-lock.json found, using npm ci for faster install"
              NPM_COMMAND="npm ci"
            else
              echo "📄 package-lock.json not found, using npm install"
              NPM_COMMAND="npm install"
            fi
            
            echo ""
            echo "Running: $NPM_COMMAND"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            $NPM_COMMAND 2>&1 | tee npm-install.log
            NPM_EXIT_CODE=${PIPESTATUS[0]}
            
            if [ $NPM_EXIT_CODE -ne 0 ]; then
              echo ""
              echo "❌ ERROR: npm install failed with exit code $NPM_EXIT_CODE"
              echo "Last 50 lines of npm install log:"
              tail -50 npm-install.log
              exit $NPM_EXIT_CODE
            fi
            
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "✅ Dependencies installed successfully"
            
            if [ -d "node_modules" ]; then
              echo "node_modules size: $(du -sh node_modules | cut -f1)"
              echo "Number of packages: $(ls node_modules | wc -l)"
            else
              echo "❌ ERROR: node_modules directory not created!"
              exit 1
            fi
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
            
            echo "Current directory: $(pwd)"
            echo "NODE_ENV: ${NODE_ENV}"
            echo ""
            
            # Clean old build
            if [ -d ".next" ]; then
              echo "🗑️ Removing old .next build directory..."
              rm -rf .next
            fi
            
            echo ""
            echo "Starting build process..."
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            npm run build 2>&1 | tee build.log
            BUILD_EXIT_CODE=${PIPESTATUS[0]}
            
            if [ $BUILD_EXIT_CODE -ne 0 ]; then
              echo ""
              echo "❌ ERROR: Build failed with exit code $BUILD_EXIT_CODE"
              echo ""
              echo "Last 100 lines of build log:"
              tail -100 build.log
              echo ""
              echo "Checking for common build errors..."
              
              if grep -q "out of memory" build.log; then
                echo "💥 MEMORY ERROR detected!"
                echo "Current memory usage:"
                free -h
              fi
              
              if grep -q "ENOSPC" build.log; then
                echo "💥 DISK SPACE ERROR detected!"
                echo "Disk usage:"
                df -h
              fi
              
              if grep -q "Module not found" build.log; then
                echo "💥 MISSING MODULE ERROR detected!"
                echo "Check if all dependencies are installed correctly"
              fi
              
              exit $BUILD_EXIT_CODE
            fi
            
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "✅ Build completed successfully"
            
            # Verify build output
            if [ -d ".next" ]; then
              echo "✅ .next directory created"
              echo ".next directory size: $(du -sh .next | cut -f1)"
              
              if [ -f ".next/BUILD_ID" ]; then
                echo "✅ BUILD_ID file exists"
                echo "BUILD_ID: $(cat .next/BUILD_ID)"
              else
                echo "❌ WARNING: BUILD_ID file not found!"
              fi
              
              if [ -d ".next/standalone" ]; then
                echo "✅ Standalone build detected"
              fi
              
              if [ -d ".next/static" ]; then
                echo "✅ Static assets generated"
              fi
            else
              echo "❌ ERROR: .next directory not created!"
              exit 1
            fi
          '''
        }
      }
    }
    
    stage('Deploy with PM2') {
      steps {
        script {
          echo '🚀 Deploying application with PM2...'
          sh '''
            cd ${DEPLOY_DIR}
            
            echo "Current PM2 processes before deployment:"
            pm2 list
            echo ""
            
            # Check if app is already running
            if pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1; then
              echo "🔄 Application '${PM2_APP_NAME}' is running, stopping it..."
              pm2 stop ${PM2_APP_NAME}
              pm2 delete ${PM2_APP_NAME}
              echo "✅ Old application stopped and deleted"
            else
              echo "ℹ️ Application '${PM2_APP_NAME}' not running"
            fi
            
            echo ""
            echo "Starting new PM2 instance..."
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            pm2 start npm \
              --name "${PM2_APP_NAME}" \
              --interpreter node \
              --cwd ${DEPLOY_DIR} \
              --time \
              --env NODE_ENV=production \
              --max-memory-restart 500M \
              -- start
            
            PM2_EXIT_CODE=$?
            
            if [ $PM2_EXIT_CODE -ne 0 ]; then
              echo "❌ ERROR: PM2 failed to start with exit code $PM2_EXIT_CODE"
              exit $PM2_EXIT_CODE
            fi
            
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            
            # Save PM2 process list
            pm2 save --force
            
            echo "✅ PM2 application started"
            echo ""
            echo "Current PM2 status:"
            pm2 list
            
            echo ""
            echo "Application details:"
            pm2 describe ${PM2_APP_NAME}
          '''
        }
      }
    }
    
    stage('Health Check') {
      steps {
        script {
          echo '🏥 Running health checks...'
          sh '''
            echo "Waiting 10 seconds for application to initialize..."
            sleep 10
            
            echo ""
            echo "Checking PM2 status..."
            
            # Check if process exists
            if ! pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1; then
              echo "❌ ERROR: Application not found in PM2!"
              echo "Current PM2 processes:"
              pm2 list
              exit 1
            fi
            
            # Check if process is online
            if pm2 describe ${PM2_APP_NAME} | grep -q 'status.*online'; then
              echo "✅ Application status: ONLINE"
            else
              echo "❌ ERROR: Application is NOT online!"
              echo ""
              echo "Application details:"
              pm2 describe ${PM2_APP_NAME}
              echo ""
              echo "Last 50 lines of logs:"
              pm2 logs ${PM2_APP_NAME} --nostream --lines 50
              exit 1
            fi
            
            # Check restart count
            RESTART_COUNT=$(pm2 describe ${PM2_APP_NAME} | grep 'restarts' | awk '{print $NF}' | grep -o '[0-9]*' || echo "0")
            echo "Restart count: $RESTART_COUNT"
            
            if [ "$RESTART_COUNT" -gt 3 ]; then
              echo "❌ WARNING: Application has restarted $RESTART_COUNT times!"
              echo "This might indicate crashes. Check logs below:"
              pm2 logs ${PM2_APP_NAME} --nostream --lines 30
              exit 1
            fi
            
            # Check memory usage
            echo ""
            echo "Memory usage:"
            pm2 describe ${PM2_APP_NAME} | grep -i memory
            
            # Check CPU usage
            echo ""
            echo "CPU usage:"
            pm2 describe ${PM2_APP_NAME} | grep -i cpu
            
            # Check uptime
            echo ""
            echo "Uptime:"
            pm2 describe ${PM2_APP_NAME} | grep -i uptime
            
            # Show recent logs
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "Recent application logs (last 20 lines):"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            pm2 logs ${PM2_APP_NAME} --nostream --lines 20
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            echo ""
            echo "✅ Health check passed!"
          '''
        }
      }
    }
    
    stage('Final Verification') {
      steps {
        script {
          echo '✅ Running final verification...'
          sh '''
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "📊 DEPLOYMENT SUMMARY"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            
            echo "Application: ${PM2_APP_NAME}"
            echo "Deploy Directory: ${DEPLOY_DIR}"
            echo "Build Number: ${BUILD_NUMBER}"
            echo "Deployed by: ${BUILD_USER:-Jenkins}"
            echo ""
            
            echo "📦 Package info:"
            cd ${DEPLOY_DIR}
            cat package.json | grep -A 2 '"name"' | head -3
            
            echo ""
            echo "🔧 PM2 Status:"
            pm2 list
            
            echo ""
            echo "💾 Disk usage after deployment:"
            du -sh ${DEPLOY_DIR}
            
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
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
          echo ""
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          echo "🎉 SUCCESS - Application is live!"
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          echo ""
          echo "PM2 Status:"
          pm2 list
          echo ""
          echo "Application logs (last 15 lines):"
          pm2 logs ${PM2_APP_NAME} --nostream --lines 15
          echo ""
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        '''
      }
    }
    
    failure {
      script {
        echo '❌❌❌ DEPLOYMENT FAILED! ❌❌❌'
        sh '''
          echo ""
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          echo "💥 FAILURE DIAGNOSTICS"
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          echo ""
          echo "Failed Stage: ${STAGE_NAME}"
          echo "Build Number: ${BUILD_NUMBER}"
          echo ""
          
          echo "📊 System Status:"
          echo "Memory usage:"
          free -h
          echo ""
          echo "Disk usage:"
          df -h
          echo ""
          
          echo "🔧 PM2 Status:"
          pm2 list || echo "PM2 list failed"
          echo ""
          
          if pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1; then
            echo "Application status in PM2:"
            pm2 describe ${PM2_APP_NAME}
            echo ""
            echo "Application logs (last 50 lines):"
            pm2 logs ${PM2_APP_NAME} --nostream --lines 50
          else
            echo "Application not found in PM2"
          fi
          
          echo ""
          echo "📄 Build logs (if any):"
          if [ -f "${DEPLOY_DIR}/build.log" ]; then
            echo "Last 50 lines of build.log:"
            tail -50 ${DEPLOY_DIR}/build.log
          else
            echo "No build.log found"
          fi
          
          echo ""
          echo "📄 NPM install logs (if any):"
          if [ -f "${DEPLOY_DIR}/npm-install.log" ]; then
            echo "Last 30 lines of npm-install.log:"
            tail -30 ${DEPLOY_DIR}/npm-install.log
          else
            echo "No npm-install.log found"
          fi
          
          echo ""
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          echo "💡 TROUBLESHOOTING TIPS:"
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          echo "1. Check the logs above for specific error messages"
          echo "2. Verify .env.production file exists with correct values"
          echo "3. Check if disk space is sufficient"
          echo "4. Check if memory is sufficient"
          echo "5. Verify all dependencies are compatible"
          echo "6. Check PM2 logs: sudo -u jenkins pm2 logs ${PM2_APP_NAME}"
          echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        '''
      }
    }
    
    always {
      script {
        echo '🧹 Cleanup...'
        sh '''
          # Clean up temporary files
          rm -f ${DEPLOY_DIR}/npm-install.log || true
          rm -f ${DEPLOY_DIR}/build.log || true
        '''
      }
    }
  }
}

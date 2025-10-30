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
        '''
      }
    }
    
    stage('Checkout') {
      steps {
        echo '📦 Checking out code from GitHub...'
        git branch: 'main',
            credentialsId: 'hostinger_ssh',
            url: 'https://github.com/ZairoDev/Adminstro.git'
        sh '''
          echo "✅ Code checked out"
          echo "Commit: $(git log -1 --oneline)"
          ls -la
        '''
      }
    }
    
    stage('Sync Files') {
      steps {
        echo '📁 Syncing files to deployment directory...'
        sh '''
          echo "Source: $WORKSPACE"
          echo "Destination: ${DEPLOY_DIR}"
          
          rsync -av --delete \
            --exclude=node_modules \
            --exclude=.next \
            --exclude=.git \
            $WORKSPACE/ ${DEPLOY_DIR}/
          
          echo "✅ Files synced"
          echo "Files in deploy directory:"
          ls -la ${DEPLOY_DIR}
        '''
      }
    }
    
    stage('Install Dependencies') {
      steps {
        echo '📦 Installing dependencies...'
        sh '''
          cd ${DEPLOY_DIR}
          echo "Running npm install..."
          npm install 2>&1 | tee npm-install.log
          
          if [ ${PIPESTATUS[0]} -ne 0 ]; then
            echo "❌ npm install failed"
            tail -50 npm-install.log
            exit 1
          fi
          
          echo "✅ Dependencies installed"
          echo "node_modules size: $(du -sh node_modules 2>/dev/null | cut -f1 || echo 'N/A')"
        '''
      }
    }
    
    stage('Build Application') {
      steps {
        echo '🏗️ Building Next.js application...'
        sh '''
          cd ${DEPLOY_DIR}
          
          echo "Removing old build..."
          rm -rf .next
          
          echo "Starting build..."
          npm run build 2>&1 | tee build.log
          
          if [ ${PIPESTATUS[0]} -ne 0 ]; then
            echo "❌ Build failed"
            tail -100 build.log
            exit 1
          fi
          
          echo "✅ Build completed"
          
          if [ -d ".next" ]; then
            echo "✅ .next directory created"
            echo ".next size: $(du -sh .next | cut -f1)"
            if [ -f ".next/BUILD_ID" ]; then
              echo "BUILD_ID: $(cat .next/BUILD_ID)"
            fi
          else
            echo "❌ .next directory NOT created!"
            exit 1
          fi
        '''
      }
    }
    
    stage('Deploy with PM2') {
      steps {
        echo '🚀 Deploying with PM2...'
        sh '''
          cd ${DEPLOY_DIR}
          
          echo "Stopping old instance..."
          pm2 delete ${PM2_APP_NAME} 2>/dev/null || echo "No previous instance"
          
          echo "Starting new instance..."
          pm2 start npm \
            --name "${PM2_APP_NAME}" \
            --interpreter node \
            --cwd ${DEPLOY_DIR} \
            --time \
            --env NODE_ENV=production \
            --max-memory-restart 500M \
            -- start
          
          pm2 save --force
          
          echo "✅ PM2 started"
          pm2 list
        '''
      }
    }
    
    stage('Health Check') {
      steps {
        echo '🏥 Running health check...'
        sh '''
          echo "Waiting 10 seconds..."
          sleep 10
          
          if pm2 describe ${PM2_APP_NAME} | grep -q 'status.*online'; then
            echo "✅ Application is ONLINE"
          else
            echo "❌ Application is NOT online"
            pm2 describe ${PM2_APP_NAME}
            pm2 logs ${PM2_APP_NAME} --nostream --lines 50
            exit 1
          fi
          
          RESTARTS=$(pm2 describe ${PM2_APP_NAME} | grep 'restarts' | awk '{print $NF}' | grep -o '[0-9]*' || echo "0")
          echo "Restart count: $RESTARTS"
          
          if [ "$RESTARTS" -gt 3 ]; then
            echo "❌ Too many restarts!"
            pm2 logs ${PM2_APP_NAME} --nostream --lines 30
            exit 1
          fi
          
          echo "✅ Health check passed"
        '''
      }
    }
  }
  
  post {
    success {
      echo '✅✅✅ DEPLOYMENT SUCCESSFUL! ✅✅✅'
      sh '''
        pm2 list
        echo ""
        echo "Recent logs:"
        pm2 logs ${PM2_APP_NAME} --nostream --lines 10
      '''
    }
    
    failure {
      echo '❌❌❌ DEPLOYMENT FAILED! ❌❌❌'
      sh '''
        echo "Failed at: ${STAGE_NAME}"
        echo ""
        echo "PM2 Status:"
        pm2 list || true
        echo ""
        if pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1; then
          echo "PM2 Logs:"
          pm2 logs ${PM2_APP_NAME} --nostream --lines 50 || true
        fi
        echo ""
        if [ -f "${DEPLOY_DIR}/build.log" ]; then
          echo "Build Log:"
          tail -50 ${DEPLOY_DIR}/build.log || true
        fi
        if [ -f "${DEPLOY_DIR}/npm-install.log" ]; then
          echo "NPM Install Log:"
          tail -30 ${DEPLOY_DIR}/npm-install.log || true
        fi
      '''
    }
    
    always {
      sh '''
        # Cleanup log files
        rm -f ${DEPLOY_DIR}/npm-install.log || true
        rm -f ${DEPLOY_DIR}/build.log || true
      '''
    }
  }
}

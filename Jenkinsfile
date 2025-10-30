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
          echo "Node version: $(node --version)"
          echo "NPM version: $(npm --version)"
          echo "PM2 version: $(pm2 --version)"
        '''
      }
    }
    
    stage('Checkout') {
      steps {
        echo '📦 Checking out code...'
        git branch: 'main',
            credentialsId: 'hostinger_ssh',
            url: 'https://github.com/ZairoDev/Adminstro.git'
        sh 'echo "✅ Code checked out"'
      }
    }
    
    stage('Sync Files') {
      steps {
        echo '📁 Syncing files...'
        sh '''
          rsync -av --delete \
            --exclude=node_modules \
            --exclude=.next \
            --exclude=.git \
            ${WORKSPACE}/ ${DEPLOY_DIR}/
          echo "✅ Files synced"
        '''
      }
    }
    
    stage('Install Dependencies') {
      steps {
        echo '📦 Installing dependencies...'
        sh '''
          cd ${DEPLOY_DIR}
          npm install > npm-install.log 2>&1
          NPM_EXIT=$?
          
          if [ $NPM_EXIT -ne 0 ]; then
            echo "❌ npm install failed"
            cat npm-install.log
            exit 1
          fi
          
          echo "✅ Dependencies installed"
        '''
      }
    }
    
    stage('Build Application') {
      steps {
        echo '🏗️ Building application...'
        sh '''
          cd ${DEPLOY_DIR}
          rm -rf .next
          
          npm run build > build.log 2>&1
          BUILD_EXIT=$?
          
          if [ $BUILD_EXIT -ne 0 ]; then
            echo "❌ Build failed"
            cat build.log
            exit 1
          fi
          
          if [ ! -d ".next" ]; then
            echo "❌ .next directory not created!"
            exit 1
          fi
          
          echo "✅ Build completed"
        '''
      }
    }
    
    stage('Deploy with PM2') {
      steps {
        echo '🚀 Deploying...'
        sh '''
          cd ${DEPLOY_DIR}
          pm2 delete ${PM2_APP_NAME} 2>/dev/null || true
          pm2 start npm --name ${PM2_APP_NAME} -- start
          pm2 save --force
          echo "✅ Deployed"
          pm2 list
        '''
      }
    }
    
    stage('Health Check') {
      steps {
        echo '🏥 Health check...'
        sh '''
          sleep 10
          if pm2 describe ${PM2_APP_NAME} | grep -q "status.*online"; then
            echo "✅ Application is online"
          else
            echo "❌ Application failed"
            pm2 logs ${PM2_APP_NAME} --nostream --lines 50
            exit 1
          fi
        '''
      }
    }
  }
  
  post {
    success {
      echo '✅✅✅ DEPLOYMENT SUCCESSFUL! ✅✅✅'
      sh 'pm2 list'
    }
    failure {
      echo '❌❌❌ DEPLOYMENT FAILED! ❌❌❌'
      sh '''
        pm2 list || true
        pm2 logs ${PM2_APP_NAME} --nostream --lines 50 || true
      '''
    }
    always {
      sh '''
        rm -f ${DEPLOY_DIR}/npm-install.log || true
        rm -f ${DEPLOY_DIR}/build.log || true
      '''
    }
  }
}

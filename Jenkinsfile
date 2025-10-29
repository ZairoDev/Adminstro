pipeline {
  agent any

  environment {
    NODE_VERSION = '18'
    DEPLOY_DIR = '/var/www/adminstro'
    REPO_URL = 'https://github.com/ZairoDev/Adminstro.git'
    BRANCH = 'main'
  }

  stages {
    stage('Checkout Code') {
      steps {
        echo '📦 Cloning repository...'
        git branch: "${BRANCH}", credentialsId: 'github_token', url: "${REPO_URL}"
      }
    }

    stage('Setup Node.js') {
      steps {
        echo '⚙️ Installing Node.js...'
        sh '''
          curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
          sudo apt-get install -y nodejs
          node -v
          npm -v
        '''
      }
    }

    stage('Install Dependencies') {
      steps {
        echo '📁 Installing dependencies...'
        dir("${DEPLOY_DIR}") {
          // Ensure directory exists and repo code is copied
          sh '''
            sudo mkdir -p ${DEPLOY_DIR}
            sudo rsync -av --exclude=node_modules --exclude=.next ./ ${DEPLOY_DIR}/
            cd ${DEPLOY_DIR}
            npm ci
          '''
        }
      }
    }

    stage('Build Project') {
      steps {
        echo '🏗️ Building Next.js project...'
        dir("${DEPLOY_DIR}") {
          sh '''
            sudo rm -rf .next
            npm run build
          '''
        }
      }
    }

    stage('Restart Server with PM2') {
      steps {
        echo '🚀 Restarting application with PM2...'
        sh '''
          if pm2 describe adminstro > /dev/null; then
            pm2 restart adminstro
          else
            cd ${DEPLOY_DIR}
            pm2 start npm --name "adminstro" -- run start
          fi
          pm2 save
        '''
      }
    }
  }

  post {
    success {
      echo '✅ Deployment successful!'
    }
    failure {
      echo '❌ Deployment failed!'
    }
  }
}

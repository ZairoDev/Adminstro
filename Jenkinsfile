pipeline {
  agent any

  environment {
    NODE_VERSION = '18'
    DEPLOY_DIR = '/var/www/adminstro'
  }

  stages {
    stage('Checkout') {
      steps {
        git branch: 'main', credentialsId: 'github_token', url: 'https://github.com/ZairoDev/Adminstro.git'
      }
    }

    stage('Install Node.js') {
      steps {
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
        dir("${DEPLOY_DIR}") {
          sh 'npm install'
        }
      }
    }

    stage('Build Project') {
      steps {
        dir("${DEPLOY_DIR}") {
          sh 'npm run build'
        }
      }
    }

    stage('Restart Server') {
      steps {
        sh '''
          pm2 stop adminstro || true
          pm2 start npm --name "adminstro" -- start
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

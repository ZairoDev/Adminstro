pipeline {
  agent any

  environment {
    DEPLOY_DIR = '/var/www/adminstro'
    PM2_APP_NAME = 'adminstro'
  }

  stages {
    stage('Checkout') {
      steps {
        git branch: 'main',
            credentialsId: 'hostinger_ssh',
            url: 'https://github.com/ZairoDev/Adminstro.git'
      }
    }

    stage('Install Dependencies') {
      steps {
        sh '''
          cd ${DEPLOY_DIR}
          cp -r $WORKSPACE/* ${DEPLOY_DIR}/
          npm install
        '''
      }
    }

    stage('Build') {
      steps {
        sh '''
          cd ${DEPLOY_DIR}
          npm run build
        '''
      }
    }

    stage('Deploy') {
      steps {
        sh '''
          cd ${DEPLOY_DIR}
          pm2 delete ${PM2_APP_NAME} || true
          pm2 start npm --name ${PM2_APP_NAME} -- start
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

pipeline {
  agent any

  environment {
    PM2_APP_NAME = 'adminstro'
    DEPLOY_DIR = '/var/www/adminstro'
  }

  stages {
    stage('Checkout') {
      steps {
        git branch: 'main',
            credentialsId: 'hostinger_ssh',
            url: 'https://github.com/ZairoDev/Adminstro.git'
      }
    }

    stage('Deploy') {
      steps {
        sh '''
          # Copy files
          cp -r $WORKSPACE/* ${DEPLOY_DIR}/
          
          # Install dependencies
          cd ${DEPLOY_DIR}
          npm install
          
          # Build
          npm run build
          
          # Deploy with PM2
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
      sh 'pm2 list'
    }
    failure {
      echo '❌ Deployment failed!'
    }
  }
}

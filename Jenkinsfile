pipeline {
  agent any

  environment {
    NODE_VERSION = '20'
    DEPLOY_DIR = '/var/www/adminstro'
    REPO_URL = 'https://github.com/ZairoDev/Adminstro.git'
    BRANCH = 'main'
    PM2_APP_NAME = 'adminstro'
    NODE_ENV = 'production'
    NEXT_TELEMETRY_DISABLED = '1'
  }

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '5'))
    disableConcurrentBuilds()
  }

  stages {

    stage('Checkout Code') {
      steps {
        echo '📦 Cloning repository...'
        git branch: "${BRANCH}", credentialsId: 'hostinger_ssh', url: "${REPO_URL}"
      }
    }

    stage('Setup Environment') {
      steps {
        script {
          echo '⚙️ Setting up directories and Node.js...'
          sh '''
            sudo mkdir -p ${DEPLOY_DIR}
            sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
            
            if ! command -v node &> /dev/null; then
              echo "Installing Node.js ${NODE_VERSION}..."
              curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
              sudo apt-get install -y nodejs
            fi

            npm install -g pm2
          '''
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        script {
          echo '📦 Installing dependencies...'
          sh '''
            rsync -av --delete \
              --exclude=node_modules \
              --exclude=.next \
              --exclude=.git \
              --exclude=.env.local \
              ./ ${DEPLOY_DIR}/

            cd ${DEPLOY_DIR}
            if [ ! -f ".env.production" ]; then
              echo "⚠️ Missing .env.production. Please add it before build."
              exit 1
            fi

            npm ci || npm install
          '''
        }
      }
    }

    stage('Build Project') {
      steps {
        script {
          echo '🏗️ Building Next.js project...'
          sh '''
            cd ${DEPLOY_DIR}
            rm -rf .next
            npm run build
          '''
        }
      }
    }

    stage('Deploy with PM2') {
      steps {
        script {
          echo '🚀 Deploying with PM2...'
          sh '''
            cd ${DEPLOY_DIR}

            if pm2 describe ${PM2_APP_NAME} > /dev/null 2>&1; then
              pm2 stop ${PM2_APP_NAME}
              pm2 delete ${PM2_APP_NAME}
            fi

            pm2 start npm --name "${PM2_APP_NAME}" -- run start
            pm2 save
          '''
        }
      }
    }

    stage('Health Check') {
      steps {
        script {
          echo '🏥 Verifying PM2 app status...'
          sh '''
            if ! pm2 describe ${PM2_APP_NAME} | grep -q "online"; then
              echo "❌ Application is not online!"
              pm2 logs ${PM2_APP_NAME} --nostream --lines 20
              exit 1
            fi
            echo "✅ Application is online."
          '''
        }
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
      sh 'pm2 logs ${PM2_APP_NAME} --lines 30 --nostream || true'
    }
    always {
      cleanWs()
    }
  }
}

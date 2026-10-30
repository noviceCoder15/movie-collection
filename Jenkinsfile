pipeline {
  agent any
  tools { nodejs 'node22' }

  // Poll GitHub every minute for new commits
  triggers { pollSCM('* * * * *') }

  environment {
    APP_NAME = 'movie-collection'
    VERSION  = "1.0.${BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install') {
      steps { sh 'npm ci' }
    }

    stage('Test') {
      steps { sh 'npm test' }
    }

    stage('Build') {
      // Artifact name includes build number and Git commit, e.g. movie-collection-1.0.3-a1b2c3d.tar.gz
      steps { sh 'VERSION="${VERSION}-$(git rev-parse --short HEAD)" npm run build' }
    }

    stage('Archive') {
      steps { archiveArtifacts artifacts: 'dist/*.tar.gz', fingerprint: true }
    }
  }

  post {
    success { echo "Build ${VERSION} succeeded" }
    failure { echo "Build ${VERSION} failed" }
  }
}
pipeline {
    agent any
    
    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerHub')
        DOCKERHUB_USER = 'joshhd01'
        BACKEND_IMAGE = "${DOCKERHUB_USER}/encuentros-backend"
        FRONTEND_IMAGE = "${DOCKERHUB_USER}/encuentros-frontend"
        DATABASE_IMAGE = "${DOCKERHUB_USER}/encuentros-database"
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build Backend') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                dir('encuentros-back') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }
        
        stage('Build Frontend') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                dir('encuentros-front') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }
        
        stage('Build Docker Images') {
            parallel {
                stage('Build Backend Image') {
                    steps {
                        script {
                            dir('encuentros-back') {
                                sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest ."
                            }
                        }
                    }
                }
                stage('Build Frontend Image') {
                    steps {
                        script {
                            dir('encuentros-front') {
                                sh "docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} -t ${FRONTEND_IMAGE}:latest ."
                            }
                        }
                    }
                }
                stage('Build Database Image') {
                    steps {
                        script {
                            dir('database') {
                                sh "docker build -t ${DATABASE_IMAGE}:${IMAGE_TAG} -t ${DATABASE_IMAGE}:latest ."
                            }
                        }
                    }
                }
            }
        }
        
        stage('Push to DockerHub') {
            steps {
                script {
                    sh 'echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin'
                    
                    sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${BACKEND_IMAGE}:latest"
                    
                    sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${FRONTEND_IMAGE}:latest"
                    
                    sh "docker push ${DATABASE_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${DATABASE_IMAGE}:latest"
                    
                    sh 'docker logout'
                }
            }
        }
    }
    
    post {
        success {
            echo 'Pipeline ejecutado correctamente'
            echo "Imagenes publicadas en DockerHub:"
            echo "- ${BACKEND_IMAGE}:${IMAGE_TAG}"
            echo "- ${FRONTEND_IMAGE}:${IMAGE_TAG}"
            echo "- ${DATABASE_IMAGE}:${IMAGE_TAG}"
        }
        failure {
            echo 'El pipeline fallo. Revisar los logs para mas detalles.'
        }
        always {
            deleteDir()
        }
    }
}
# Manifiestos de Kubernetes para Encuentros

Esta carpeta contiene todos los manifiestos necesarios para desplegar la aplicación Encuentros en Kubernetes.

## 📁 Estructura de Archivos

### Configuración Base

- **`namespace.yaml`** - Define el namespace `encuentros` donde se desplegarán todos los recursos
- **`configmap.yaml`** - Variables de configuración no sensibles (URLs, puertos, configuraciones)
- **`secret.yaml`** - Credenciales y datos sensibles (passwords, tokens)

### Almacenamiento

- **`database-pvc.yaml`** - PersistentVolumeClaims para almacenamiento persistente
  - `database-pvc`: 2Gi para PostgreSQL
  - `loki-pvc`: 1Gi para Loki
  - `grafana-pvc`: 500Mi para Grafana
  - `prometheus-pvc`: 1Gi para Prometheus

### Aplicación Principal

- **`database-deployment.yaml`** - PostgreSQL database

  - 1 replica
  - Health checks configurados
  - Persistent storage

- **`backend-deployment.yaml`** - NestJS API backend

  - 2 replicas para alta disponibilidad
  - Health checks (liveness & readiness)
  - Variables de entorno desde ConfigMap y Secret

- **`frontend-deployment.yaml`** - Angular frontend
  - 2 replicas para alta disponibilidad
  - Health checks configurados
  - Servido por Nginx

### Servicios de Red

- **`service.yaml`** - Define todos los servicios
  - `database-service`: ClusterIP en puerto 5432
  - `backend-service`: ClusterIP en puerto 3000
  - `frontend-service`: NodePort 30080 (acceso externo)

### Observabilidad (Opcional)

- **`loki-deployment.yaml`** - Sistema de agregación de logs

  - ConfigMap incluido para configuración de Loki
  - Service ClusterIP

- **`prometheus-deployment.yaml`** - Sistema de métricas y monitoreo

  - ConfigMap incluido para configuración de Prometheus
  - Service NodePort 30090 (acceso externo)

- **`grafana-deployment.yaml`** - Visualización de métricas y logs

  - Service NodePort 30030 (acceso externo)
  - Integración con Prometheus y Loki

- **`cadvisor-deployment.yaml`** - Métricas de contenedores
  - DaemonSet (ejecuta en cada nodo)
  - Service ClusterIP

## 🚀 Orden de Despliegue Recomendado

1. **Namespace y Configuración**

   ```bash
   kubectl apply -f namespace.yaml
   kubectl apply -f secret.yaml
   kubectl apply -f configmap.yaml
   ```

2. **Almacenamiento**

   ```bash
   kubectl apply -f database-pvc.yaml
   ```

3. **Base de Datos**

   ```bash
   kubectl apply -f database-deployment.yaml
   ```

   Esperar a que esté lista antes de continuar.

4. **Backend**

   ```bash
   kubectl apply -f backend-deployment.yaml
   ```

5. **Frontend**

   ```bash
   kubectl apply -f frontend-deployment.yaml
   ```

6. **Servicios de Red**

   ```bash
   kubectl apply -f service.yaml
   ```

7. **Observabilidad (Opcional)**
   ```bash
   kubectl apply -f loki-deployment.yaml
   kubectl apply -f prometheus-deployment.yaml
   kubectl apply -f grafana-deployment.yaml
   kubectl apply -f cadvisor-deployment.yaml
   ```

## 🎯 Despliegue Rápido

Para desplegar todo de una vez:

```bash
kubectl apply -f ./kube/
```

## 📊 Arquitectura de Despliegue

```
┌─────────────────────────────────────────────────────────┐
│                    Namespace: encuentros                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐     ┌──────────────┐                  │
│  │  Frontend    │────▶│  Backend     │                  │
│  │  (Angular)   │     │  (NestJS)    │                  │
│  │  2 replicas  │     │  2 replicas  │                  │
│  └──────────────┘     └──────────────┘                  │
│         │                     │                          │
│         │                     ▼                          │
│         │              ┌──────────────┐                  │
│         │              │  Database    │                  │
│         │              │  (PostgreSQL)│                  │
│         │              │  1 replica   │                  │
│         │              └──────────────┘                  │
│         │                     │                          │
│         │                     ▼                          │
│         │              ┌──────────────┐                  │
│         │              │     PVC      │                  │
│         │              │    (2Gi)     │                  │
│         │              └──────────────┘                  │
│         │                                                │
│  ┌──────┴──────────────────────────────────────┐        │
│  │         Observabilidad (Opcional)            │        │
│  │                                               │        │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │        │
│  │  │ Grafana  │─▶│Prometheus│  │   Loki   │  │        │
│  │  └──────────┘  └──────────┘  └──────────┘  │        │
│  │       │              │              │        │        │
│  │       └──────────────┴──────────────┘        │        │
│  │                      │                       │        │
│  │                ┌──────────┐                  │        │
│  │                │ cAdvisor │                  │        │
│  │                └──────────┘                  │        │
│  └───────────────────────────────────────────────┘        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Configuración de Recursos

### Requests y Limits por Componente

| Componente | CPU Request | CPU Limit | Memory Request | Memory Limit |
| ---------- | ----------- | --------- | -------------- | ------------ |
| Database   | 250m        | 500m      | 256Mi          | 512Mi        |
| Backend    | 250m        | 500m      | 256Mi          | 512Mi        |
| Frontend   | 100m        | 200m      | 128Mi          | 256Mi        |
| Loki       | 100m        | 200m      | 128Mi          | 256Mi        |
| Prometheus | 200m        | 400m      | 256Mi          | 512Mi        |
| Grafana    | 100m        | 200m      | 128Mi          | 256Mi        |
| cAdvisor   | 100m        | 200m      | 128Mi          | 256Mi        |

### Puertos Expuestos

| Servicio   | Tipo      | Puerto Interno | Puerto Externo (NodePort) |
| ---------- | --------- | -------------- | ------------------------- |
| Database   | ClusterIP | 5432           | -                         |
| Backend    | ClusterIP | 3000           | -                         |
| Frontend   | NodePort  | 80             | 30080                     |
| Loki       | ClusterIP | 3100           | -                         |
| Prometheus | NodePort  | 9090           | 30090                     |
| Grafana    | NodePort  | 3000           | 30030                     |
| cAdvisor   | ClusterIP | 8080           | -                         |

## 🔐 Secretos y ConfigMaps

### Secret: encuentros-secret

Contiene:

- `POSTGRES_DB`: Nombre de la base de datos
- `POSTGRES_USER`: Usuario de PostgreSQL
- `POSTGRES_PASSWORD`: Contraseña de PostgreSQL
- `DB_USERNAME`: Usuario para el backend
- `DB_PASSWORD`: Contraseña para el backend
- `GF_SECURITY_ADMIN_USER`: Usuario admin de Grafana
- `GF_SECURITY_ADMIN_PASSWORD`: Contraseña admin de Grafana

### ConfigMap: encuentros-config

Contiene:

- `DB_TYPE`: Tipo de base de datos (postgres)
- `DB_HOST`: Host de la base de datos
- `DB_PORT`: Puerto de la base de datos
- `DB_DATABASE`: Nombre de la base de datos
- `DB_SSL`: Configuración SSL
- `BACKEND_PORT`: Puerto del backend
- `GF_USERS_ALLOW_SIGN_UP`: Permitir registro en Grafana
- `GF_NEWS_NEWS_FEED_ENABLED`: Habilitar noticias en Grafana

## 🔍 Health Checks

### Database

- **Liveness Probe**: `pg_isready` cada 10s
- **Readiness Probe**: `pg_isready` cada 5s

### Backend

- **Liveness Probe**: HTTP GET `/` cada 10s
- **Readiness Probe**: HTTP GET `/` cada 5s

### Frontend

- **Liveness Probe**: HTTP GET `/` cada 10s
- **Readiness Probe**: HTTP GET `/` cada 5s

### Grafana

- **Liveness Probe**: HTTP GET `/api/health` cada 10s
- **Readiness Probe**: HTTP GET `/api/health` cada 5s

## 📝 Notas Importantes

1. **Almacenamiento Persistente**: Los PVCs se crean automáticamente en Minikube usando el StorageClass por defecto.

2. **Estrategia de Despliegue**:

   - Database: `Recreate` (no permite múltiples réplicas)
   - Backend/Frontend: `RollingUpdate` (despliegue sin downtime)

3. **Seguridad**:

   - Cambiar las credenciales por defecto en `secret.yaml` para producción
   - Los secretos están en texto plano en el archivo, usar mecanismos seguros para producción

4. **Escalabilidad**:

   - Backend y Frontend tienen 2 réplicas para alta disponibilidad
   - Pueden escalarse con: `kubectl scale deployment <name> --replicas=N -n encuentros`

5. **Observabilidad**:
   - Los componentes de observabilidad son opcionales
   - Se pueden omitir para despliegues más ligeros

## 🛠️ Comandos Útiles

### Ver estado de recursos

```bash
kubectl get all -n encuentros
kubectl get pods -n encuentros -o wide
kubectl get svc -n encuentros
kubectl get pvc -n encuentros
```

### Ver logs

```bash
kubectl logs -n encuentros deployment/backend -f
kubectl logs -n encuentros deployment/frontend -f
kubectl logs -n encuentros deployment/database -f
```

### Acceder a un pod

```bash
kubectl exec -it -n encuentros <pod-name> -- /bin/bash
```

### Escalar deployments

```bash
kubectl scale deployment backend -n encuentros --replicas=3
kubectl scale deployment frontend -n encuentros --replicas=3
```

### Actualizar configuración

```bash
kubectl edit configmap encuentros-config -n encuentros
kubectl edit secret encuentros-secret -n encuentros
```

### Reiniciar deployments

```bash
kubectl rollout restart deployment/backend -n encuentros
kubectl rollout restart deployment/frontend -n encuentros
```

## 🗑️ Limpieza

Para eliminar todos los recursos:

```bash
# Opción 1: Eliminar todo el namespace
kubectl delete namespace encuentros

# Opción 2: Eliminar archivos específicos
kubectl delete -f ./kube/
```

## 📚 Recursos Adicionales

- [Documentación de Kubernetes](https://kubernetes.io/docs/)
- [Mejores prácticas de Kubernetes](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Configuración de recursos](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Health checks en Kubernetes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

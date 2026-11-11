# DIAGRAMAS MERMAID

Todos describen la **arquitectura objetivo**. Nada de esto existe hoy en `bimartin`. Las piezas marcadas «CiDios»
existen en ese repositorio y se proponen para reutilizar.

## 1. Arquitectura general

```mermaid
flowchart TB
  U[Usuarios: lectores, estudiantes, investigadores, editores] --> CDN[CDN y caché HTTP]
  CDN --> WEB[Web Next.js]
  WEB --> API[API FastAPI /v1]
  API --> DOM[Dominio]
  subgraph DOM[Módulos de dominio]
    BIB[Motor bíblico]
    ALI[Alineación y comparación]
    EDI[Edición Biblia de Martín]
    EVI[Evidencias e historiografía - CiDios]
    LIB[Biblioteca - CiDios]
    ACA[Academia]
    RAG[Chat y RAG]
  end
  DOM --> PG[(PostgreSQL + pgvector)]
  DOM --> S3[(Objetos S3: manuscritos, PDF)]
  API --> Q[Cola de trabajos en Postgres - CiDios]
  Q --> W[Workers: ingestión, embeddings, HARNESS]
  W --> LLM[Capa de proveedores de IA]
  W --> PG
  API --> OBS[Métricas, trazas, alertas]
```

## 2. Servicios y despliegue

```mermaid
flowchart LR
  subgraph Vercel
    WEB[Web Next.js]
  end
  subgraph Contenedores persistentes
    API[API]
    WK1[Worker de ingestión]
    WK2[Worker HARNESS]
  end
  subgraph Datos gestionados
    PG[(Postgres primario)]
    RR[(Réplica de lectura)]
    S3[(Almacenamiento de objetos)]
    BK[(Backups cifrados en otro proveedor)]
  end
  WEB --> API
  API --> PG
  API --> RR
  WK1 --> PG
  WK1 --> S3
  WK2 --> PG
  PG --> BK
  WK2 --> P1[Proveedor IA A]
  WK2 --> P2[Proveedor IA B]
```

## 3. Motor bíblico

```mermaid
flowchart LR
  SRC[Fuente autorizada: USFM, USX, OSIS, TEI] --> LIC{Licencia registrada y suficiente}
  LIC -- no --> CAT[Solo ficha de catálogo]
  LIC -- sí --> IMP[Importador]
  IMP --> NORM[Normalización Unicode NFC]
  NORM --> VER[Asignación de esquema de versificación]
  VER --> CV[Versión de corpus con checksum]
  CV --> PU[Unidades de pasaje]
  PU --> TOK[Tokens, lemas, morfología - solo lenguas originales]
  PU --> IDX[Índices FTS y vectores]
  PU --> API[API de lectura con control de permisos por edición]
```

## 4. Correspondencia multiversión

```mermaid
flowchart TB
  A[Ref. nativa en edición A<br/>Sal 51:1 hebreo] --> SA[Esquema A]
  B[Ref. nativa en edición B<br/>Sal 50:3 LXX] --> SB[Esquema B]
  SA --> MAP[versification_map<br/>relation: equal, split, merge,<br/>partial, moved, absent, uncertain]
  SB --> MAP
  MAP --> PIV[Referencia pivote interna]
  PIV --> CMP[Comparador]
  CMP --> R1[Celda con texto]
  CMP --> R2[Celda vacía con motivo explícito]
  VAR[Registro de variante con testigos] -.único origen del término omisión.-> CMP
```

## 5. Flujo editorial

```mermaid
stateDiagram-v2
  [*] --> BORRADOR_IA
  BORRADOR_IA --> REVISION_FILOLOGICA: humano con rol filólogo
  REVISION_FILOLOGICA --> BORRADOR_IA: rechazado
  REVISION_FILOLOGICA --> REVISION_ESTILO
  REVISION_ESTILO --> REVISION_PLURAL: revisores de varias tradiciones
  REVISION_PLURAL --> REVISION_FILOLOGICA: objeción
  REVISION_PLURAL --> APROBADO: comité editorial
  APROBADO --> PUBLICADO: versión inmutable
  PUBLICADO --> ERRATA: corrección documentada
  ERRATA --> REVISION_FILOLOGICA
```

## 6. HARNESS multiagente

```mermaid
flowchart LR
  REQ[Solicitud] --> PL[PLANNER]
  PL --> RT[ROUTER: modelo, herramientas, presupuesto]
  RT --> EX[EXECUTOR]
  EX --> EC[EVIDENCE COLLECTOR]
  EC --> VA[VALIDATOR: contrato, citas literales, licencia]
  VA -- falla --> EX
  VA --> CR[CRITIC: solo en tareas sensibles]
  CR -- objeción --> EX
  CR --> HR{HUMAN REVIEW}
  HR -- rechaza --> PL
  HR -- aprueba --> PB[PUBLISHER]
  ST[(Estado, checkpoints, eventos, costes)] --- PL
  ST --- EX
  ST --- VA
  ST --- PB
```

## 7. RAG

```mermaid
flowchart TB
  Q[Pregunta + modo] --> CL{¿Resoluble con datos estructurados?}
  CL -- sí --> SQL[Consulta SQL: lemas, morfología, paralelos, variantes]
  CL -- no --> RET[Recuperación híbrida FTS + vectores, RRF]
  RET --> FIL[Filtros: licencia IA, idioma, canon, tradición]
  FIL --> HIE[Expansión jerárquica: obra, capítulo, fragmento]
  HIE --> RER[Reordenamiento]
  SQL --> GEN[Generación con citas obligatorias]
  RER --> GEN
  RER -- sin evidencia --> NE[Respuesta: no hay evidencia verificada]
  GEN --> CHK{Cada cita existe y contiene lo alegado}
  CHK -- no --> REJ[Respuesta descartada y regenerada o rechazada]
  CHK -- sí --> ANS[Respuesta con citas que abren la fuente]
```

## 8. Modelo entidad-relación (núcleo)

```mermaid
erDiagram
  LANGUAGE ||--o{ EDITION : "idioma"
  WORK ||--o{ EDITION : "tiene"
  LICENSE ||--o{ EDITION : "rige"
  RIGHTS_HOLDER ||--o{ EDITION : "titular"
  EDITION ||--o{ CORPUS_VERSION : "versiones"
  VERSIFICATION_SCHEME ||--o{ EDITION : "numera"
  CANON ||--o{ CANON_BOOK : "incluye"
  BOOK ||--o{ CANON_BOOK : "pertenece"
  CORPUS_VERSION ||--o{ PASSAGE_UNIT : "contiene"
  BOOK ||--o{ PASSAGE_UNIT : "ubica"
  PASSAGE_UNIT ||--o{ TOKEN : "se divide"
  LEMMA ||--o{ TOKEN : "lematiza"
  VERSIFICATION_SCHEME ||--o{ VERSIFICATION_MAP : "origen/destino"
  MANUSCRIPT ||--o{ WITNESS_READING : "atestigua"
  VARIANT_UNIT ||--o{ WITNESS_READING : "lecturas"
  PASSAGE_UNIT ||--o{ VARIANT_UNIT : "localiza"
  TRANSLATION_UNIT ||--o{ TRANSLATION_REVISION : "historial"
  TRANSLATION_REVISION ||--o{ EDITORIAL_APPROVAL : "aprobaciones"
  TRANSLATION_UNIT ||--o{ STUDY_NOTE : "notas"
  BIBLIO_WORK ||--o{ DOCUMENT : "manifestación"
  DOCUMENT ||--o{ DOCUMENT_CHUNK : "fragmentos"
  CLAIM ||--o{ EVIDENCE_LINK : "sustenta"
  DOCUMENT_CHUNK ||--o{ EVIDENCE_LINK : "cita"
  CLAIM ||--o{ PERSPECTIVE : "posturas"
  PASSAGE_UNIT ||--o{ PASSAGE_LINK : "vincula"
  USER ||--o{ CONVERSATION : "posee"
  USER ||--o{ ENROLLMENT : "cursa"
  COURSE ||--o{ LESSON : "contiene"
  HARNESS_RUN ||--o{ HARNESS_TASK : "tareas"
  HARNESS_RUN ||--o{ COST_LEDGER : "costes"
```

## 9. Seguridad

```mermaid
flowchart TB
  NET[Internet] --> WAF[CDN, límite de peticiones]
  WAF --> WEB[Web: solo clave anónima]
  WEB --> API[API: valida JWT, aplica rol]
  API --> RLS[(Postgres con RLS en todas las tablas)]
  API --> LICG[Guardia de licencia por edición]
  WK[Workers: clave de servicio, sin exposición pública] --> RLS
  ING[Contenido externo] --> QUA[Cuarentena y detección de inyección]
  QUA --> WK
  WK --> TOOLS[Herramientas por lista blanca por agente, sin red arbitraria]
  SEC[Gestor de secretos] -.-> API
  SEC -.-> WK
  AUD[(Auditoría inmutable)] --- API
  AUD --- WK
```

## 10. Ingestión documental

```mermaid
flowchart LR
  D[Descubrimiento] --> L{Licencia}
  L -- insuficiente --> M[Solo metadatos]
  L -- suficiente --> F[Descarga]
  F --> QU[Cuarentena]
  QU --> X[Extracción de texto]
  X --> N[Normalización]
  N --> H{Duplicado por hash}
  H -- sí --> STOP[Se enlaza al existente]
  H -- no --> INJ[Detección de inyección]
  INJ --> CH[Fragmentación con localizador]
  CH --> EM[Embeddings]
  EM --> CA[Catalogación y materias]
  CA --> RV[Revisión humana]
  RV --> PUB[Disponible para lectura y RAG]
```

## 11. Publicación

```mermaid
sequenceDiagram
  participant E as Editor
  participant S as Sistema
  participant C as Comité editorial
  E->>S: Solicita publicar versión N
  S->>S: Valida contrato, licencias y similitud con textos protegidos
  S->>C: Presenta diff, fuentes y aprobaciones previas
  C->>S: Aprueba con firma nominal
  S->>S: Congela versión, calcula checksum, registra historial
  S-->>E: Publicado; caché invalidada
```

## 12. Backups

```mermaid
flowchart LR
  PG[(Postgres)] --> PITR[Recuperación a punto en el tiempo]
  PG --> DUMP[Volcado lógico diario cifrado]
  DUMP --> OFF[(Otro proveedor)]
  SRC[Corpus de origen versionados] --> OFF
  OFF --> DR[Simulacro trimestral de restauración]
  DR --> REP[Informe: RPO y RTO medidos]
```

## 13. Monitorización

```mermaid
flowchart TB
  API --> MET[Métricas: latencia, errores, saturación]
  WK[Workers] --> COLA[Antigüedad de la cola]
  RAG --> IAQ[Calidad IA: citas rechazadas, no_evidence, coste por consulta]
  MET --> AL[Alertas]
  COLA --> AL
  IAQ --> AL
  AL --> ONC[Responsable de guardia]
  LOG[Registros estructurados y auditoría] --> PAN[Paneles]
```

## 14. Evolución tecnológica

```mermaid
flowchart LR
  M[Medición periódica] --> T{¿Se cruzó un umbral del ADR?}
  T -- no --> K[Mantener]
  T -- sí --> P[Prueba comparativa con el conjunto dorado]
  P --> D{¿Mejora medida y coste aceptable?}
  D -- no --> K
  D -- sí --> MIG[Migración por lotes y reversible]
```

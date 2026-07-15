# HTTP Intelligence Architecture — Diagrams

## Component Diagram

```mermaid
graph TB
    subgraph "HTTP Intelligence Engine"
        direction TB
        AD[HttpIntelligenceAdapter<br/>ScanEnginePlugin] --> TLS[TlsIntelligence]
        AD --> SHI[SecurityHeadersIntelligence]
        AD --> HBI[HttpBehaviourIntelligence]
        AD --> IF[InfrastructureFingerprinting]
        AD --> CI[CookieIntelligence]
        AD --> RLI[RateLimitingIntelligence]
        AD --> HAP[HttpArtifactPublisher]
    end

    subgraph "Platform (unchanged)"
        direction TB
        PA[Plugin API<br/>ScanEnginePlugin]
        AB[Artifact Bus<br/>category+key dedup]
        PE[Pipeline Executor<br/>StageHandler dispatch]
        EB[Event Bus<br/>pub/sub]
    end

    subgraph "Production HTTP Client"
        direction TB
        HC[IHttpClient<br/>injectable interface]
        DC[DefaultHttpClient<br/>pool + DNS cache]
        MC[MockHttpClient<br/>test doubles]
    end

    AD -.implements.-> PA
    HAP -.publishes.-> AB
    SH -.creates.-> STAGE[Stage Handler Bridge]
    STAGE -.uses.-> PE
    HC -.injected.-> AD
```

## Sequence Diagram — Full Scan Flow

```mermaid
sequenceDiagram
    participant PE as Pipeline Executor
    participant SH as Stage Handler
    participant AD as HttpIntelligenceAdapter
    participant TLS as TlsIntelligence
    participant SHI as SecurityHeaders
    participant HB as HttpBehaviour
    participant IF as InfraFingerprint
    participant CI as CookieIntelligence
    participant RL as RateLimiting
    participant HAP as ArtifactPublisher
    participant AB as Artifact Bus

    PE->>SH: dispatch(stageHandler, {artifactBus, eventBus, abortSignal})
    SH->>AD: scan(context, onEvent)

    Note over AD: Phase 1: TLS Analysis
    AD->>TLS: tlsProbe(url)
    TLS-->>AD: TlsProbeResult
    AD->>AD: buildProfile(probe, response)
    AD->>AB: publish(TLS Profile)

    Note over AD: Phase 2: Security Headers
    AD->>SHI: analyze(response)
    SHI-->>AD: HeaderProfile
    AD->>AB: publish(Header Profile)

    Note over AD: Phase 3: Behaviour Analysis
    AD->>HB: analyze(response)
    AD->>HB: analyze(response) × N
    AD->>HB: checkStatusConsistency(responses)
    AD->>AB: publish(Redirect Graph)

    Note over AD: Phase 4: Infrastructure
    AD->>IF: fingerprint(response, cookies)
    IF-->>AD: InfrastructureProfile

    Note over AD: Phase 5: Cookie Analysis
    AD->>CI: analyze(response)
    CI-->>AD: CookieProfile

    Note over AD: Phase 6: Rate Limiting
    AD->>RL: analyzeFromResponse(response)
    RL-->>AD: RateLimitProfile

    Note over AD: Phase 7: Artifacts
    AD->>HAP: publishAll(data)
    HAP->>AB: 8 artifact categories
    HAP->>AB: shared_context update

    AD-->>PE: ScanEngineResult
```

## Artifact Flow Diagram

```mermaid
graph LR
    subgraph "HTTP Intelligence Engine"
        A[ScanEngine] -->|scan()| B[TLS Intel]
        A -->|scan()| C[Headers Intel]
        A -->|scan()| D[Behaviour Intel]
        A -->|scan()| E[Infra FP]
        A -->|scan()| F[Cookie Intel]
        A -->|scan()| G[Rate Limit]
        B -->|publish| H1[TLS Profile]
        C -->|publish| H2[Header Profile]
        D -->|publish| H3[Redirect Graph]
        E -->|publish| H4[Infra Profile]
        F -->|publish| H5[Cookie Profile]
        G -->|publish| H6[Rate Limit]
        A -->|publish| H7[HTTP Profile]
        A -->|publish| H8[Shared Context]
    end

    subgraph "Artifact Bus (existing)"
        AB1[category: tls]
        AB2[category: headers]
        AB3[category: redirects]
        AB4[category: technology]
        AB5[category: cookies]
        AB6[category: metadata]
    end

    H1 --> AB1
    H2 --> AB2
    H3 --> AB3
    H4 --> AB4
    H5 --> AB5
    H6 --> AB6
    H7 --> AB4
    H8 --> AB6
```
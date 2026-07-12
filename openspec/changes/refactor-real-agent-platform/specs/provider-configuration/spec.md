## ADDED Requirements

### Requirement: Built-In Provider Catalog

The system SHALL expose a stable built-in Provider catalog that includes OpenAI, Qwen, DeepSeek and the other approved default Providers regardless of key availability.

#### Scenario: No Provider keys are configured
- **WHEN** the public Provider catalog is requested with no configured keys
- **THEN** every built-in Provider is present
- **AND** every Provider is marked unconfigured and disabled

#### Scenario: One Provider key is configured
- **WHEN** the public Provider catalog is requested with one configured key
- **THEN** the matching Provider and its curated models are enabled
- **AND** all other built-in Providers remain visible but disabled

### Requirement: Server-Only Provider Secrets

Provider API keys MUST be read from server-side configuration and MUST NOT be returned to or persisted by the browser.

#### Scenario: Provider status is returned
- **WHEN** the browser requests Provider configuration
- **THEN** the response contains only public IDs, labels, models, configuration status and disabled reasons
- **AND** it contains no API key or reversible key fragment

#### Scenario: Logs are inspected
- **WHEN** Provider discovery or a model request is logged
- **THEN** logs contain Provider/model IDs and operational metadata only
- **AND** API keys are redacted

### Requirement: Provider and Model Selection Validation

The system SHALL allow only configured Providers and curated model IDs to start Agent runs.

#### Scenario: Enabled model is selected
- **WHEN** the user submits chat with a configured Provider and allowed model
- **THEN** the selection is resolved to the corresponding Mastra model
- **AND** the Agent run is allowed to start

#### Scenario: Disabled Provider is submitted manually
- **WHEN** a client submits an unconfigured Provider despite the disabled UI
- **THEN** the server rejects the request before any model call
- **AND** it returns a typed missing-configuration error

#### Scenario: Unknown model is submitted
- **WHEN** a client submits a model outside the Provider allowlist
- **THEN** the server rejects the request before any model call
- **AND** it returns a typed invalid-model error

### Requirement: Disabled Provider User Interface

The system SHALL display all built-in Providers in the selector and visually disable entries whose required key is not configured.

#### Scenario: User opens the model selector
- **WHEN** some Provider keys are missing
- **THEN** missing-key Providers remain visible
- **AND** they cannot be selected
- **AND** the UI explains which server configuration is required without revealing a secret value

#### Scenario: No Provider is available
- **WHEN** all Providers are disabled
- **THEN** chat submission is disabled
- **AND** the UI displays setup guidance

### Requirement: Resilient Selection Preference

The system SHALL persist only the selected Provider/model IDs and SHALL recover when the saved selection is unavailable.

#### Scenario: Saved selection remains configured
- **WHEN** the application reloads and the saved Provider/model is still enabled
- **THEN** that selection is restored

#### Scenario: Saved selection becomes unavailable
- **WHEN** the application reloads and the saved Provider/model is disabled or removed
- **THEN** the first configured allowed model is selected
- **OR** the no-Provider state is shown when none are configured


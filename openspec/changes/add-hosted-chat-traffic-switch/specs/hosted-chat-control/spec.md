## ADDED Requirements

### Requirement: Hosted Chat Traffic Switch

The server SHALL use the server-only `CHAT_ENABLED` environment variable as a global gate for all new Chat, Provider and Research execution while preserving enabled behavior when the variable is absent.

#### Scenario: Switch is absent or enabled
- **WHEN** `CHAT_ENABLED` is absent or is the normalized value `true`
- **THEN** existing server environment Provider configuration and page BYOK requests continue to work
- **AND** existing clients remain compatible

#### Scenario: Switch is disabled
- **WHEN** `CHAT_ENABLED` is `false`
- **THEN** every new `POST /api/chat` request returns `503 CHAT_DISABLED` with `Cache-Control: no-store`
- **AND** the server does not read the Chat payload, resolve a Provider, construct a request Research gateway or invoke an upstream service
- **AND** page BYOK cannot bypass the gate

#### Scenario: Switch has an invalid configured value
- **WHEN** `CHAT_ENABLED` is configured to an empty or other value besides normalized `true`
- **THEN** Chat is disabled fail-closed
- **AND** the invalid value is not returned to the browser or written to application logs

### Requirement: Public Hosted Chat Status

The Provider catalog response SHALL expose only the booleans required for the browser to render hosted Chat availability and SHALL NOT expose hosted credential material.

#### Scenario: Hosted configuration is inspected
- **WHEN** the browser requests `GET /api/providers`
- **THEN** the response includes `hostedChat.enabled` and `hostedChat.tavilyConfigured`
- **AND** DeepSeek hosted configuration remains represented by the DeepSeek Provider's existing `configured` boolean
- **AND** the response contains no environment value, Key, length, fragment, platform Token or project identifier

#### Scenario: Hosted Chat is disabled in the UI
- **WHEN** `hostedChat.enabled` is false
- **THEN** the Chat composer, suggestions, submission and Demo credential inputs are disabled
- **AND** the settings entry remains accessible and explains that Chat is disabled by deployment configuration

#### Scenario: Hosted credentials are configured
- **WHEN** hosted Chat is enabled and DeepSeek or Tavily has a server environment Key
- **THEN** the Demo credentials Dialog displays “Configured by hosted environment” for that service
- **AND** a page override, when present, displays “Configured for this page” without revealing either value

### Requirement: Vercel Switch Operations

The project documentation SHALL provide a bounded operator workflow for changing the Production Chat switch on Vercel and verifying the resulting deployment.

#### Scenario: Operator changes the switch
- **WHEN** an operator adds or updates Production `CHAT_ENABLED`
- **THEN** the documentation requires a new deployment or Redeploy before the change is expected to apply
- **AND** it provides both Dashboard and Vercel CLI instructions

#### Scenario: Operator verifies disabled traffic
- **WHEN** the new Production deployment uses `CHAT_ENABLED=false`
- **THEN** the documented checks verify `hostedChat.enabled` is false and `/api/chat` returns `503 CHAT_DISABLED`
- **AND** the runbook warns that old deployment URLs retain their previous environment and may require Deployment Protection or Provider Key revocation

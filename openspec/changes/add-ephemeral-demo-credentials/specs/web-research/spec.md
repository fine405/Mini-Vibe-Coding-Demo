## MODIFIED Requirements

### Requirement: External Research Security and Limits

Research tools MUST use server-managed credentials by default and MAY use an explicitly supplied page-memory Tavily demo key only as a request-scoped override. They MUST restrict outbound services, prevent credential persistence or disclosure, propagate cancellation and bound all external inputs and outputs.

#### Scenario: Browser bundle is built
- **WHEN** the production client bundle is inspected
- **THEN** no hard-coded `TAVILY_API_KEY` value or external Research HTTP adapter code is present
- **AND** only the explicitly entered ephemeral value may exist in the current page memory and same-origin Chat request that uses it
- **AND** only validated source data crosses back through the UI message stream

#### Scenario: Tavily demo key is supplied
- **WHEN** a valid bounded Tavily demo key is present in a Chat request
- **THEN** the server uses it only to construct that request's fixed-upstream Tavily gateway
- **AND** it takes precedence over the server environment without being stored globally, cached, logged or returned

#### Scenario: Tavily demo key is absent
- **WHEN** a Research run has no ephemeral Tavily override
- **THEN** the gateway continues to use the server-side `TAVILY_API_KEY`
- **AND** missing server configuration produces the existing sanitized Tool error

#### Scenario: External operation exceeds its bound
- **WHEN** an upstream request times out, is rate-limited, is aborted or exceeds the response limit
- **THEN** execution stops without an automatic billable retry
- **AND** the UI receives a sanitized actionable Tool error that contains no submitted credential or upstream response body

#### Scenario: Search content contains instructions
- **WHEN** a search result contains prompt-like instructions
- **THEN** the Agent treats it only as untrusted reference data
- **AND** it does not override system rules, expose secrets or gain additional tools

#### Scenario: User saves a Tavily demo key
- **WHEN** the user saves the key in Demo credentials settings
- **THEN** no Tavily request is made solely to validate the saved key
- **AND** quota is consumed only after an explicit Chat request causes the Agent to call `web_search`

## ADDED Requirements

### Requirement: Full-Stack Application Runtime

The system SHALL run as a TanStack Start application with a browser-rendered IDE surface and server-side API capabilities in one deployable application.

#### Scenario: IDE loads in the browser
- **WHEN** a user opens the application
- **THEN** the TanStack Start document shell is served
- **AND** the IDE workspace is rendered on the client
- **AND** Monaco, Sandpack, IndexedDB and Web Worker code are not executed during server rendering

#### Scenario: Static-only deployment is attempted
- **WHEN** the application is deployed without its server runtime
- **THEN** documentation and health checks SHALL make clear that Agent APIs are unavailable
- **AND** the production deployment SHALL require Node.js 22.13 or newer

### Requirement: Same-Origin Hono API

The system SHALL route `/api/*` server requests from TanStack Start to a server-only Hono application using Fetch `Request` and `Response` objects.

#### Scenario: API request is dispatched
- **WHEN** a request is sent to a supported `/api/*` path
- **THEN** TanStack Start delegates the request to Hono
- **AND** Hono returns the response without a second server process or cross-origin request

#### Scenario: Unknown API route is requested
- **WHEN** a request is sent to an unknown `/api/*` path
- **THEN** the API returns a structured 404 response
- **AND** the IDE HTML shell is not returned for that API request

### Requirement: Server and Client Code Isolation

The system MUST keep Provider secrets, Mastra configuration and Hono implementation out of the client bundle.

#### Scenario: Production client bundle is inspected
- **WHEN** a production build is generated
- **THEN** the client output contains no Provider key values
- **AND** Mastra, Hono and server Provider modules are absent from the client dependency graph

#### Scenario: Client code imports a server-only module
- **WHEN** a client-reachable module imports a server-only Agent or Provider module
- **THEN** development or build validation fails with a clear isolation error


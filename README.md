### system-core

Practicing full-stack system design with Go, Bun, and TypeScript. A monorepo project dedicated to refining my development workflow and exploring new technologies.


### 🔭 Project Philosophy

This project is built on the principle of "Single Source of Truth." By leveraging a Monorepo structure, I am exploring how to bridge the gap between backend efficiency and frontend agility, ensuring type safety and architectural consistency across the entire stack.

### 🛠 Tech Stack & Exploration

- **Monorepo Management**: Bun Workspaces (Efficient dependency handling and shared logic)

- **Backend**: Golang (Concurrency patterns and high-performance API design)

- **Frontend**: React + Vite (Fast, modern UI development)

- **Language**: TypeScript (Ensuring end-to-end type safety)

- **Database**: PostgreSQL (Reliable relational data foundations)

### 🏗 System Architecture

The repository is structured to separate concerns while allowing for seamless shared resources:
```
system-core/
├── apps/
│   ├── api/          # Go-based backend services
│   └── web/          # React frontend application
├── packages/
│   └── shared-types/ # Shared TypeScript definitions & schemas
└── docker-compose.yml
```

### 🚀 Learning Goals

- Implementation of shared-package strategies in a full-stack environment.

- Optimizing development workflows using modern runtimes like Bun.

- Refining gRPC/REST implementation patterns for robust data exchange.

- Maintaining clean, readable, and well-documented codebases.


`"I am a lifelong learner, dedicated to the craft of building better systems one commit at a time."`

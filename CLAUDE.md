# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
# Development
npm run dev              # Start development server (http://localhost:3000)
npm run build            # Build for production
npm run preview          # Preview production build
npm run type-check       # Run TypeScript type checking without emit

# Note: There are currently no linting or test commands configured
```

## High-Level Architecture

This is an idle game with a **Central State Management + Complete Component Independence** architecture that was recently migrated from a traditional layered architecture.

### Core Architecture Principles

1. **CentralStateManager**: Single source of truth combining GameManager + GameState functionality
   - All state changes flow through this central manager
   - Provides state change logging for debugging
   - Handles save/load functionality
   - Manages the game loop and system lifecycle

2. **Complete Component Independence**: Each feature is a self-contained module
   - Components only know about CentralStateManager and EventBus
   - No direct references between components
   - Communication only through events

3. **Event-Driven Communication**: Systems communicate via EventBus
   - Prioritized event handling
   - Type-safe event names via GameEvents constants
   - Loose coupling between systems

### Directory Structure

```
src/
├── core/                    # Central management layer
│   ├── CentralStateManager.ts  # Unified state + system management
│   ├── BaseSystem.ts           # Base class for all systems
│   ├── EventBus.ts             # Event communication hub
│   └── types/                  # Shared type definitions
│
├── components/              # Independent feature modules
│   ├── character/          # Character management
│   ├── team/               # Team management & drag-drop UI
│   ├── building/           # Building construction
│   ├── cooking/            # Cooking system (placeholder)
│   ├── combat/             # Combat system (placeholder)
│   ├── exploration/        # Exploration system (placeholder)
│   └── time/               # Time progression
│
├── ui/                     # UI management
│   ├── UIManager.ts        # UI component registry
│   ├── BaseComponent.ts    # Base UI component class
│   └── shared/             # Shared UI components
│
└── utils/                  # Utilities
    ├── FormulaCalculator.ts   # Mathematical formulas
    └── DataManager.ts         # JSON data loading
```

### System Lifecycle

1. **Initialization**: CentralStateManager registers all systems
2. **Start**: Systems begin processing, game loop starts
3. **Update**: Fixed timestep updates (60 FPS target)
4. **Events**: Systems communicate state changes
5. **Save/Load**: Automatic saves every 5 minutes

### Key Systems

- **CharacterSystem**: Manages character spawning, skills, status updates
- **TeamSystem** (TeamWorkSystem): Handles team formation and task assignment
- **TimeSystem**: Controls game time progression (1 game hour = 1 real minute)
- **UISystem**: Manages UI component lifecycle

### Adding New Features

To add a new system:
1. Create a new folder under `src/components/[feature]/`
2. Extend `BaseSystem` for the system logic
3. Create component-specific types in `types.ts`
4. Register in `main.ts` with `centralStateManager.registerSystem()`

### TypeScript Configuration

- Strict mode enabled
- Path aliases configured (@core, @systems, etc.) in both tsconfig.json and vite.config.ts
- Target: ES2020

### Development Tips

- Use `window.centralStateManager` in browser console (dev mode only) for debugging
- State changes are logged in CentralStateManager for debugging
- Check component independence - components should never import from other components
- Event names are constants in `GameEvents` for type safety

### Build Issues to Watch

- Some old imports may still reference the pre-migration structure
- DataManager methods like `getBuildingCost` vs `getBuildingBaseCost` have naming inconsistencies
- Character.ts has some type issues with skill calculations that use `as any` casts

### Current Migration Status

The project was recently migrated from a traditional layered architecture to a component-based architecture. Most core systems have been migrated, but there may be lingering import issues or type errors from the old structure. The migration focused on:
- Consolidating GameManager + GameState into CentralStateManager
- Moving systems into independent component folders
- Updating all imports to use the new structure
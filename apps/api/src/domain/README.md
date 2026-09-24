# Domain boundary

`domain` is reserved for future business capabilities. Feature 001 contains no domain implementation, types, entities, tables, or modules.

Dependency direction is `domain -> modules -> core`. Future domain code may depend only on public module surfaces; it must not import core internals directly.

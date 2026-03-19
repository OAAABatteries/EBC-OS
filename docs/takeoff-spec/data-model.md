# EBC-OS Takeoff Module — Data Model

## Entity Relationship Overview

```
Project
  └── Bid (1:many)
        ├── Alternate (1:many)
        ├── ChangeOrder (1:many)
        ├── Sheet (1:many)
        │     ├── Scale (1:1 per sheet)
        │     ├── Layer (many:many)
        │     └── Geometry (1:many — the actual drawn takeoff objects)
        │           └── linked to → Condition
        ├── Condition (1:many)
        │     ├── LinearCondition
        │     ├── AreaCondition
        │     ├── CountCondition
        │     └── AttachmentCondition
        ├── BidArea (1:many)
        ├── Zone (1:many)
        ├── TypicalGroup (1:many)
        │     └── TypicalGroupInstance (1:many)
        ├── TypicalArea (1:many)
        └── QuantityResult (computed from Geometry + Condition + Scale)
              └── feeds → Assembly (pricing)
```

---

## Core Entities

### 1. Project
The top-level container. Maps to an EBC project/job.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| name | string | Project name (e.g., "Memorial Hermann Pearland") |
| gc | string | General Contractor |
| address | string | Project address |
| phase | string | Commercial / Medical / Retail / Residential |
| status | enum | estimating, submitted, awarded, in-progress, complete |
| pm | string | Assigned PM |
| created | timestamp | Created date |
| bidId | uuid? | Link to EBC bid record |

### 2. Bid
A pricing attempt for a project. One project may have multiple bids (base bid + alternates).

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| projectId | uuid | FK to Project |
| name | string | Bid name (e.g., "Base Bid", "Alternate 1") |
| type | enum | base, alternate, change_order |
| status | enum | draft, estimating, submitted, awarded, lost |
| value | number | Total bid value |
| dueDate | date | Bid due date |
| wastePct | number | Waste percentage (default 5%) |
| taxRate | number | Tax rate on materials (default 8.25%) |
| overheadPct | number | Overhead percentage (default 10%) |
| profitPct | number | Profit percentage (default 10%) |
| created | timestamp | |

### 3. Sheet (Plan Page)
A single page/drawing from the plan set.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| bidId | uuid | FK to Bid |
| name | string | Sheet name (e.g., "A1.01 - First Floor Plan") |
| discipline | enum | architectural, structural, mep, civil, demo |
| floor | string | Floor/level identifier |
| sortOrder | number | Display order |
| pdfData | blob | The actual PDF page data |
| pageNumber | number | Page number in source PDF |
| sourceFile | string | Original filename |

### 4. Scale
Calibration data for a sheet. Tells the system how to convert pixel measurements to real-world units.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| sheetId | uuid | FK to Sheet |
| pixelsPerFoot | number | Calculated calibration value |
| scaleLabel | string | Display label (e.g., "1/4\" = 1'-0\"") |
| calibrationPoints | json | The two points used for calibration [{x,y},{x,y}] |
| knownDimension | number | The real-world dimension in feet |
| verified | boolean | Whether scale has been verified |
| method | enum | manual, preset, auto_detected |

**Preset scales (common in construction):**
- 1/8" = 1'-0" (1:96)
- 3/16" = 1'-0" (1:64)
- 1/4" = 1'-0" (1:48)
- 3/8" = 1'-0" (1:32)
- 1/2" = 1'-0" (1:24)
- 3/4" = 1'-0" (1:16)
- 1" = 1'-0" (1:12)
- 1-1/2" = 1'-0" (1:8)
- 3" = 1'-0" (1:4)
- Full Scale (1:1)

### 5. Condition
A "condition" is a TYPE of thing you're measuring — not the measurement itself. Think of it as a template that says "I'm measuring 3-5/8" metal stud walls at 10' height." You create the condition once, then use it to draw measurements on multiple sheets.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| bidId | uuid | FK to Bid |
| name | string | Condition name (e.g., "3-5/8\" 20ga Wall @ 10'") |
| type | enum | linear, area, count, attachment |
| color | string | Display color for takeoff objects |
| pattern | string | Line/fill pattern |
| layer | string | Layer assignment |
| assemblyCode | string | Linked assembly code (e.g., "A2") |
| folder | string | Grouping folder (e.g., "Walls", "Ceilings") |
| tags | string[] | Tags for filtering |
| isActive | boolean | Whether currently selected for takeoff |
| sortOrder | number | Display order in conditions list |

#### 5a. LinearCondition (extends Condition)
For measuring walls, piping, gutters, wiring — anything measured in LF.

| Field | Type | Description |
|-------|------|-------------|
| height | number | Wall/object height in feet |
| heightFactor | number | Height difficulty factor (from getHF) |
| thickness | number | Wall thickness (for volume calculations) |
| slope | number | Slope angle for angled runs (hips, valleys) |
| calcSF | boolean | Also calculate surface area (height * length) |
| calcVolume | boolean | Also calculate volume (h * w * length) |
| bothSides | boolean | Calculate both sides of wall |
| deductions | json[] | Auto-deductions (e.g., door openings) |
| roundTo | number? | Round each segment to this increment (e.g., 1' rounds up to nearest foot) |
| connectCorners | boolean | Connect corners of adjacent segments (needed for Auto-Fill) |
| allowCrossing | boolean | Allow segment to connect to crossing segments |
| curvedDefault | boolean | Set all segments to curved by default |
| dropRunLength | number? | Vertical run for wire/pipe drops to outlets/fixtures |

**Calculated results:** Length (LF), Surface Area (SF if enabled), Volume (CF if enabled)
**OST note:** Results shown in Conditions window are page-only; cumulative totals on Summary tab

#### 5b. AreaCondition (extends Condition)
For measuring ceilings, floors, slabs, roofing — anything measured in SF.

| Field | Type | Description |
|-------|------|-------------|
| thickness | number | For volume calculations (e.g., slab depth) |
| slope | number | Slope angle for angled surfaces (roofs) |
| calcPerimeter | boolean | Also calculate perimeter LF |
| calcGridLength | boolean | Calculate grid length (for ACT grid framing or rebar) |
| calcVolume | boolean | Also calculate volume |
| deductOpenings | boolean | Auto-deduct openings |
| surfaceType | string | floor, ceiling, wall_surface, roof |
| roundTo | number? | Round each area to this increment |
| gridSpacing | number? | Grid/tiling pattern spacing (for ACT ceiling tile layout) |
| gridPattern | string? | Grid pattern type (2x2, 2x4, custom) |

**Calculated results:** Area (SF), Perimeter (LF if enabled), Grid Length (LF if enabled), Volume (CF if enabled)
**OST note:** Grid/tiling config useful for ACT ceiling tiles, floor tiles — calculates grid runner LF

#### 5c. CountCondition (extends Condition)
For counting doors, fixtures, columns, footings — discrete items.

| Field | Type | Description |
|-------|------|-------------|
| countValue | number | How many to count per click (usually 1) |
| shape | enum | circle, square, rectangle, door, triangle, cross, custom |
| height | number | Height of counted object (for area/volume calcs — 0 = 2D) |
| width | number | Width of counted object |
| depth | number? | Depth (rectangles only; others assume depth = width) |
| size | number | Display size on plan |
| unitLabel | string | "EA", "SET", "PAIR" etc. |
| autoCount | boolean | Use AI/pattern matching to auto-detect and count (OST has this) |

**Calculated results:** Count (EA), plus optional Perimeter/Area/Volume based on shape dimensions
**OST note:** Shape selection affects which results are available (can't get "both sides" for circle, can't get "diameter" for square). Count shapes are 3D when height > 0, enabling area/volume calcs for footings, columns, etc.

#### 5d. AttachmentCondition (extends Condition)
Items that attach to linear or area conditions. Example: windows in a wall (attached to wall linear), light fixtures in a ceiling (attached to ceiling area). When you draw the parent, attachments auto-count.

| Field | Type | Description |
|-------|------|-------------|
| parentConditionId | uuid | FK to parent Condition |
| attachType | enum | per_unit, per_length, per_area |
| spacing | number | For per_length: one every N feet |
| countPer | number | How many per parent unit |

### 6. Geometry
An actual drawn measurement on a sheet. Links a Condition (what you're measuring) to coordinates (where you measured it).

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| sheetId | uuid | FK to Sheet |
| conditionId | uuid | FK to Condition |
| bidAreaId | uuid? | FK to BidArea (optional) |
| zoneId | uuid? | FK to Zone (optional) |
| type | enum | polyline, polygon, point |
| vertices | json | Array of {x, y} normalized coordinates |
| resultQty | number | Calculated quantity (LF, SF, or count) |
| resultUnit | string | LF, SF, EA, CF |
| label | string | Optional user label |
| notes | string | Optional notes |
| created | timestamp | |
| modifiedBy | string | Last modified by |

### 7. BidArea
Organizational grouping for takeoff — typically by building area or floor. OST supports up to 3 tiers (Building > Floor > Room). An entire takeoff object can only belong to one Bid Area (except Counts/Attachments).

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| bidId | uuid | FK to Bid |
| parentId | uuid? | FK to parent BidArea (for tier nesting — up to 3 levels) |
| tier | number | 1=Building, 2=Floor, 3=Room |
| name | string | Area name (e.g., "First Floor", "Wing A", "Building 2") |
| description | string | Description |
| sortOrder | number | Display order |
| color | string | Display color |

**OST Quick Add:** Type a name + numeric range (e.g., "Floor" 1-3) to auto-create "Floor 1, Floor 2, Floor 3."

### 8. Zone
Zones are different from Bid Areas — they can **bisect/split** a single takeoff object. A wall can be split between two zones. Zones cannot overlap each other. Used for finer-grained location tracking within a bid area.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| bidAreaId | uuid? | FK to BidArea (optional) |
| bidId | uuid | FK to Bid |
| name | string | Zone name (e.g., "Nurse Station", "Lobby") |
| boundary | json | Polygon boundary on sheet [{x,y},...] |
| description | string | |

**Key difference from BidAreas:** Zones split geometry at their boundaries. A 50 LF wall crossing two zones becomes 30 LF in Zone A and 20 LF in Zone B automatically.

### 9. TypicalGroup
A reusable set of takeoff that repeats across similar spaces.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| bidId | uuid | FK to Bid |
| name | string | Group name (e.g., "Standard Patient Room") |
| sourceSheetId | uuid | Sheet where the typical was defined |
| geometries | uuid[] | List of Geometry IDs that make up this typical |
| instanceCount | number | How many times this repeats |

### 10. TypicalGroupInstance
An instance where a typical group is applied.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| typicalGroupId | uuid | FK to TypicalGroup |
| sheetId | uuid | Sheet where this instance appears |
| bidAreaId | uuid? | FK to BidArea |
| position | json | {x, y} placement coordinates |
| rotation | number | Rotation angle |
| scale | number | Scale factor (usually 1.0) |
| multiplier | number | Quantity multiplier (usually 1) |

### 11. Layer
Visual organization for showing/hiding groups of takeoff on the plan.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| bidId | uuid | FK to Bid |
| name | string | Layer name (e.g., "Walls", "Ceilings", "Demo") |
| color | string | Layer color |
| visible | boolean | Whether layer is shown |
| locked | boolean | Whether layer is editable |
| sortOrder | number | Display order |

### 12. QuantityResult (computed/view)
Aggregated takeoff results for reporting and estimating.

| Field | Type | Computed From |
|-------|------|---------------|
| conditionId | uuid | Condition |
| conditionName | string | Condition.name |
| totalQty | number | Sum of Geometry.resultQty |
| unit | string | LF, SF, EA, CF |
| bidArea | string | BidArea.name |
| zone | string | Zone.name |
| assemblyCode | string | Condition.assemblyCode |
| matCost | number | totalQty * Assembly.matRate |
| labCost | number | totalQty * Assembly.labRate * heightFactor |
| totalCost | number | matCost + labCost |

### 13. Assembly (existing — already in EBC-OS)
Pricing rates per unit. Already exists in `constants.js`.

| Field | Type | Description |
|-------|------|-------------|
| code | string | Assembly code (e.g., "A2") |
| name | string | Assembly name |
| unit | string | LF, SF, EA |
| matRate | number | Material cost per unit |
| labRate | number | Labor cost per unit |
| verified | boolean | Whether rates are verified |

### 14. Template (master condition set)
Saved condition sets for reuse across bids.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| name | string | Template name (e.g., "Standard Medical Drywall") |
| trade | string | drywall, framing, both |
| conditions | json[] | Array of condition definitions |
| created | timestamp | |
| usageCount | number | Times used |

### 15. AuditLog
Track changes for revision management.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| bidId | uuid | FK to Bid |
| action | enum | create, update, delete |
| entity | string | What changed (condition, geometry, etc.) |
| entityId | uuid | ID of changed entity |
| before | json | Previous state |
| after | json | New state |
| userId | string | Who made the change |
| timestamp | timestamp | When |

---

## Key Relationships

1. **Condition → Geometry**: One condition, many geometries across many sheets
2. **Geometry → Sheet**: Each geometry belongs to exactly one sheet
3. **Geometry → BidArea**: Optional — for organizing results
4. **AttachmentCondition → Condition**: Attachments link to a parent condition
5. **TypicalGroup → Geometry**: A typical group references a set of geometries
6. **TypicalGroupInstance → Sheet**: Instances are placed on specific sheets
7. **Assembly → Condition**: Conditions link to assemblies for pricing
8. **Template → Condition[]**: Templates are saved sets of conditions

## Key Differences from Current EBC-OS

| Current EBC-OS | New Takeoff Module |
|---|---|
| Rooms contain line items | Sheets contain geometries linked to conditions |
| Manual qty entry | Qty computed from drawn measurements |
| No spatial data | Full coordinate + geometry data |
| No scale concept | Per-sheet scale calibration |
| No reuse/typical | Typical groups with instances |
| No bid areas | Bid areas + zones for rollups |
| Flat list | Layered, folder-organized conditions |
| No attachments | Attachment conditions auto-count |

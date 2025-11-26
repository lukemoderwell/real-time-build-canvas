# Node Positioning

Capability nodes are automatically positioned to avoid overlaps when created.

## Helper Functions

In `lib/utils.ts`:

- `findNonOverlappingPosition()` - Finds a single non-overlapping position near a centroid
- `positionNewNodes()` - Positions multiple new nodes, each avoiding the others

## Algorithm

1. Search in expanding "rings" around the group centroid
2. Grid spacing = node dimensions + 20px padding
3. First non-overlapping position wins
4. Fallback: linear offset if all grid positions taken

## Usage

Called in three places in `page.tsx`:

1. New capabilities added to existing feature group
2. New feature group creation (initial capabilities)
3. Single capability added via transcript analysis

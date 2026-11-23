# Shared specs

Parts of a spec that more than one product uses. Each folder in `.spec` is one
shared part, with a name, a logo and a permanent id, written in the [spec format](https://github.com/madsbuch/better-github/blob/main/spec-llms.txt).
A product copies the parts it uses into its own `.spec`, at the same path, and
records which commit it copied. The product's spec then reads, compares and
checks like any other, and its code cites the shared requirements by id
(`// Spec: tandem.SYN-5`) as it cites its own.

| | Part | Id | What it says | Used by |
| --- | --- | --- | --- | --- |
| <img src=".spec/tandem/logo.png" width="40" alt=""> | [Tandem](.spec/tandem) | `tandem` | Peer-to-peer sync between a collection's devices on the local network: discovery, pairing, the channel, merging (SQLite rows by hybrid logical clock), change tracking, snapshots, and saying why a device can't be reached. | Commonplace |

This repository is a spec itself, so Better GitHub browses it, compares its
versions and reviews its pull requests like any other.

## Writing a shared part

The rules of the spec format hold, and a few more, because a product may copy
one part without the others:

- **A part is a folder** at the top of `.spec`, with an `index.json` that gives
  it an identity:

  ```json
  { "title": "Tandem", "shared": { "id": "tandem", "logo": "tandem/logo.png" } }
  ```

  The title is the part's name, and the folder is named after it. The logo is a
  square picture in the folder.
- **The permanent id never changes.** The name, the folder and the logo can: a
  renamed part keeps its id, and the products that copied it follow it by that id.
- **Every id in the part starts with the permanent id and a dot**: `tandem.SYN-5`,
  `tandem.pairing-lifetime`. Ids from different parts never collide, and never
  collide with a product's own.
- **It uses no product's words.** Name the thing the product shares in neutral
  terms and say in the part's description what it means; the product's spec says
  what it is there ("a book is a collection"). Don't name another product.
- **It refers only to itself.** `related`, `replacedBy` and a story's
  `requirements` point inside the part. A product links its own parts to the
  shared ones, and a link holds from both ends.
- **Ids are never reused.** Like in any spec, an id is never renumbered or
  given to something else.

`npm run check` checks all of this, together with the schema, references and
histories.

## Using a shared part in a product

Check this repository out beside the product, at the commit you want, and run
from the product's root:

```sh
node ../spec-repo/scripts/import.mjs tandem
```

Or in Better GitHub: add this repository under *You → Shared specs*, then *Use in…*
on a part. Either way, the product's `.spec/tandem` is replaced with this
repository's, and where it came from is recorded in the product's root item,
`.spec/index.json`:

```json
"imports": [
  {
    "id": "tandem",
    "at": "tandem",
    "from": "madsbuch/spec-repo",
    "commit": "<the commit it was copied from>",
    "tree": "<git's id for .spec/tandem at that commit>",
    "order": 7,
    "values": [
      { "id": "tandem.pairing-lifetime", "value": "5min", "reason": "Pairing happens at a desk; a shorter window leaks less." }
    ],
    "waived": [
      { "ref": "#tandem.SYN-17", "reason": "There is no Android app." },
      { "ref": "tandem/snapshots", "reason": "The product keeps its own backups." }
    ]
  }
]
```

- **Don't edit the copy.** Git gives a folder an id made from its files, so
  `tree` says exactly what was copied. `node ../spec-repo/scripts/import.mjs --check`
  fails when the copy differs, and a product's spec test can do the same. To change
  a shared part, change it here and import it again.
- **What a product can change is in its `imports` entry.** These are `order` (where the part
  sits in the product's outline), `values` (a named value set differently for
  this product, with the reason) and `waived` (a requirement, story or whole
  part that doesn't hold in this product, with the reason). Only `values` and `waived`
  change what the spec says. To do something else, waive the shared requirement
  and write the product's own, related to it.
- **Renaming.** Change the title, rename the folder after it, and update the paths
  in the part (`related`, `replacedBy`, the logo). The next import into a product
  finds its copy by the permanent id, moves it to the new folder and moves its
  waivers of parts with it. The ids stay, so the product's code keeps citing them.
- **Updating is a spec change.** Import again at a newer commit. The pull request
  shows what changed in the part, requirement by requirement. Reconcile what in
  the product is related to it, and search the code for the changed ids.

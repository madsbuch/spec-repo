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
| <img src=".spec/keel/logo.png" width="40" alt=""> | [Keel](.spec/keel) | `keel` | Engineering rules for an app of React and TypeScript in a Tauri shell, over SQLite: the stack, a build that fails on any type or lint error, packages only once they've aged, type safety (no casts, `!`, `any` or unsafe Rust) and the JSON boundary (untrusted JSON only through a schema, with a library such as zod). | Commonplace |
| <img src=".spec/counsel/logo.png" width="40" alt=""> | [Counsel](.spec/counsel) | `counsel` | An agent in the app on a model from OpenRouter: a profession rather than a persona, the user's own key and choice of model, conversations kept as separate chats, reading the app's data with SQL or read tools that can't write, and changing the app when asked. | |
| <img src=".spec/dial/logo.png" width="40" alt=""> | [Dial](.spec/dial) | `dial` | The app's settings: one entry to them, set apart from the app's own menu (at the far end of a top bar, the bottom of a side bar), sections nested one level deep, each with an address of its own, and changes that apply as they are made, unless they must be checked. | |

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
- **What the app must be like first is its groundwork.** A part's `index.json`
  can list, in `groundwork`, what has to be true of the app before the part
  can be built: plain sentences that an agent checks by reading the product,
  not dependencies on other parts. Each one describes the app, never another
  part ("The app has settings the user can open, and a part can add a section
  of its own to them", not "the app uses the settings part"), so that any way
  of making it true will do. It uses the part's own words, and has no id. It
  lists only what the part can't bring about itself. An item can suggest
  `ways` to make it true; they are a start, not a choice:

  ```json
  "groundwork": [
    "The collection is kept in one SQLite database per device.",
    {
      "text": "The app has a place for a chat that stays open beside the screen the user is on.",
      "ways": ["a side panel the screens make room for", "a window of its own"]
    }
  ]
  ```

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

- **Groundwork comes first.** Before any of a part's code, an agent checks
  each item of its `groundwork` against the product. One that doesn't hold
  yet is never a reason to turn the part down or to stop: it is the first
  work. The agent looks into what the product has that comes closest, works
  out two or three ways to make it true here (from the part's `ways` and
  beyond), and asks the operator which to take, or whether to waive what in
  the part depends on it. The chosen way goes into the product's own spec as a
  requirement of its own, and is built before the part; a waiver goes into the
  import's `waived`, with the operator's reason. `import.mjs` prints
  the groundwork after copying, and on an update marks what is new. See
  *Adopting a shared part* in the [spec format](https://github.com/madsbuch/better-github/blob/main/spec-llms.txt).
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

# Runbook — Live-site refresh on publish (Sanity-webhook model)

How a client's public website refreshes after a post is published in the portal, and how to set it up for each client. Decided 2026-06-28 (see `dashboard-Decisions.md`, B.07).

## How it works (no portal call)

1. A client publishes a post in the portal.
2. The portal writes the published document into **that client's own Sanity project** (it promotes the draft to the published id and deletes the draft, in one transaction). The portal makes **no call** to the client's website.
3. The client's Sanity project has a **webhook** configured that fires on a publish/delete of the blog document type and POSTs to the client site's `/api/revalidate`.
4. The client site's `/api/revalidate` receiver verifies the webhook signature and revalidates the affected cache tags + page paths. The new post appears on the live site within ~1–2 minutes.

```
Portal ──(writes published doc)──► Client's Sanity project
                                         │
                                         │  Sanity webhook (POST, signed)
                                         ▼
                          Client site  POST /api/revalidate ──► revalidates pages
```

The portal stores **no revalidation secret**. The only revalidation secret is `SANITY_REVALIDATE_SECRET`, which lives on **each client site** (and is mirrored into that client's Sanity webhook config). It never touches the portal.

## What each client site must have (precondition)

Before a client's publishes will refresh their live site, that client site needs **both**:

1. **A receiver** at `POST /api/revalidate` that verifies a Sanity webhook signature (the standard `next-sanity/webhook` `parseBody` pattern) using a `SANITY_REVALIDATE_SECRET` env var, then revalidates the right paths/tags for the doc type. It should return 200 on success (or unhandled type), 401 on bad/missing signature, 400 on missing `_type`.
2. **The `SANITY_REVALIDATE_SECRET` env var** set in that site's hosting (e.g. Vercel) — a long random string, the site's own.

If a client site does **not** yet have the receiver, adding it is work in **that client's website repo** (not the portal) and is a dependency for that client's onboarding.

## Per-client setup (do this once per client, during M.01)

In **manage.sanity.io** for the client's Sanity project → **API → Webhooks → Create webhook**:

- **Name:** `Live-site revalidate (portal)`
- **URL:** the client site's revalidate endpoint, e.g. `https://<client-site-domain>/api/revalidate`
- **Dataset:** the client's dataset (usually `production`)
- **Trigger on:** Create, Update, Delete
- **Filter (GROQ):** restrict to *published* docs of the blog type(s), so routine draft saves do **not** trigger a public refresh. Use the doc type(s) from that client's registry row (`blog_doc_type`):
  - single type: `!(_id in path("drafts.**")) && _type == "blogPost"`
  - multiple types (e.g. Sunset): `!(_id in path("drafts.**")) && _type in ["blogPost", "resourceArticle"]`
- **Projection:** `{_type, _id, "slug": slug.current}`
- **HTTP method:** `POST`
- **API version:** the project's current API version
- **Secret:** paste the **same value** as the site's `SANITY_REVALIDATE_SECRET` (this is what signs the request so the receiver can verify it). Do not invent a new value; do not write it anywhere in this repo.

> Why the draft filter matters: the portal's *save-as-draft* writes a `drafts.<id>` document. Without `!(_id in path("drafts.**"))`, every autosave would needlessly revalidate the public site. The filter limits refreshes to real publishes (and deletes of published docs).

## Verifying it works (per client)

1. In the portal, edit a test post on that client and click **Publish**.
2. In manage.sanity.io → the project's webhook → **Attempts log**, confirm a `200` delivery.
3. Open the client's live site and confirm the change appears within ~1–2 minutes (allow for the site's ISR safety-net window).
4. For a delete: delete the test post in the portal and confirm the published page 404s / drops from the index after the next delivery.

The full portal-to-live-site round-trip per real client is tracked as **M.02**.

## Per-client status

| Client | `/api/revalidate` receiver | `SANITY_REVALIDATE_SECRET` set | Sanity webhook configured | Verified (M.02) |
|---|---|---|---|---|
| Sunset Services | Yes (existing) | Yes (existing) | To confirm | Pending |
| Vertex Consulting | To confirm | To confirm | To confirm | Pending |
| Dalibor Plečić | To confirm (repo pending) | To confirm | To confirm | Pending |

Update this table as each client is onboarded in M.01 and proven in M.02.

---

*dashboard | Live-site revalidation (Sanity-webhook model) | B.07 | 2026-06-28*

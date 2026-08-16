# Lab 1 — Peer Review Record  (fill this in)

**Author:** <your name> — <student id> — GitHub: @<username>
**Peer reviewer:** <partner name> — <student id> — GitHub: @<username>

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #5 | feature/1-project-foundation | Approved |
| #6 | feature/2-health-check | Approved |
| #7 | feature/3-category-seed | Approved |
| #8 | feature/4-category-list | Approved |

Reviewer comment I received: "The database seed script works great, and using `upsert` to prevent duplicates is a smart choice! One minor thing: for the health check frontend, maybe we could add a loading spinner icon instead of just text?"
How I responded: "Thanks for the review! I used the hourglass emoji (⏳) for the loading state to keep it simple without adding external icon libraries, but a spinner would definitely look better in future updates."

## Pull Requests I reviewed for my partner
My comment: "I reviewed your Category List implementation. The Supertest assertions look solid and cover the array length and specific names correctly. Good job wrapping the React state updates in `waitFor()` for the UI tests to avoid warnings!"
Partner's response: "Thank you! Yes, using `waitFor()` helped fix the act() warnings I was getting from React Testing Library."

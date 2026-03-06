
Once, a foreman was discussing the renovation of a small house with a potential client. The homeowner was worried that the walls were leaning. The house was made of bricks, and the brick walls were simply standing on the ground. Wooden props reinforced the house around the perimeter, but the walls kept threatening to collapse.

— Your house is in critical condition and requires reconstruction, — said the foreman. — We will lay a power cable to supply equipment, dig a foundation pit, install drainage, pour the foundation…
— No, no! — interrupted the homeowner, — I don’t need a pit, I need walls! A house!
— In that case, perhaps you should consider buying a modular house? — suggested the foreman.

Last month, I spoke with a startup. They have a working web service that had been written by different people over several years, and now management was wondering what to do with it. The founders told me they wanted to hire a team of a dozen developers to rewrite or modernize the application. I asked them about user stories, documentation, a task tracker, and they said they didn’t have any. They asked me to make a list of what I would do, and I wrote this:

- List key parameters that affect sales: SLA, functionality—anything to tie virtual tasks to the real world.
- Define contexts using DDD and create high-level documentation to discuss architecture and help new developers onboard.
- Identify system bottlenecks that cause scaling and availability issues.
- Align IT team’s medium-term goals with executive management.
- Create a workflow using collaboration tools—boards, trackers, messengers, repositories.
- Organize hiring and onboarding of new developers.
- Set up monitoring and backup systems.
- Break down medium-term tasks into stages and create a calendar plan.
- Implement CI/CD.
- Write an architecture change plan.
- Prioritize backlog tasks.
- Establish regular IT team meetings with product and report to executive management.

Where is the development? The answer is: the entire list. All of this falls under the [Software Life Cycle](https://en.wikipedia.org/wiki/Systems_development_life_cycle).

The startup founders said they didn’t need management, they needed operational work. Thanks to kind feedback, I was inspired to write a note explaining what development really is and why most of the items listed are not management tasks.

---

## Everything Listed Relates to Money

* **Key parameters that affect sales:** traffic, conversion, returns, how many clients come back, how many leave, and so on. We all love research, discussing development culture, arguing over standards, but the valuation of IT companies is a product of annual revenue or client base size multiplied by a factor, and code itself doesn’t matter. Development tasks should tie to measurable business metrics. I’ve worked on many projects and remember cases where owners ignored critical changes in key metrics. One project lost traffic due to competitors; another saw a rise in refunds. Ignoring these problems destroyed projects within months despite years of work. Technically they were reliable and still make some money, but market share was lost permanently. I remember the opposite at Oracle: every employee—developer, tester, manager—was told how many millions in revenue their product made, its market share, new and retained clients, competitors, etc. Vice presidents held all-hands meetings to present the same report given to the board. As Oracle’s results show, this focus on outcomes works very well.

* **Business logic** is a good criterion for modularizing a system. Defining contexts helps people understand each other, reduce communication overhead, and assign responsibilities. Studying application logic is also part of onboarding new hires. Investing in high-level documentation pays off with every new employee, module, or service.

* **System bottlenecks** prevent achieving key metric goals. They need to be reflected in backlog tasks and accounted for in development plans.

* **Medium-term goals** are what the company pays the IT team for. Writing plans is not critical for company survival, but without them developers often spend time on research and arguing over standards instead of tackling tasks that impact business.

* **Development process** using boards, task trackers, version control, meetings, design, code review, builds, testing, and deployment is natural for most teams. Without reliable development processes, you cannot predictably deliver tasks or maintain SLA uptime.

* **Hiring:** Almost everyone in projects is a hired employee. Whether hiring is a structured process or ad-hoc depends on business growth plans. Fast-growing startups need a process with minimal executive involvement. Onboarding cost equals salaries of employees training new hires plus lost revenue from tasks not completed. Large corporations can afford months for onboarding; most projects need employees productive as soon as possible. Whether hiring is a process or one-off events indicates growth plans.

* **Monitoring, logging, backup, and recovery plans** are not MVP priorities. They become valuable when the project starts spending money to acquire clients. Everything eventually breaks, and the bigger the budget, the more critical continuous service becomes. Backups reduce downtime—they are not management decisions.

* **Breaking down medium-term plans** into stages and epics makes development predictable, exposes problems sooner, and helps resolve them. This reduces employee downtime due to issues beyond their control.

* **CI/CD benefits** are not obvious. By [Lehman’s law](https://en.wikipedia.org/wiki/Lehman%27s_laws_of_software_evolution), software complexity grows with system evolution unless controlled. CI/CD is the team’s effort to control complexity growth. Running tests on build servers limits development cost growth. CI/CD is listed last because it only makes sense for growing, successful projects. For ordinary projects, deploying from a release branch is enough. Without CI/CD, development can still proceed, but QA team size, office space, equipment, and management meetings double. Growth is slower but may go unnoticed for years. I know several large projects without tests, costing hundreds of thousands yearly to rewrite untested code.

* **Architecture change plan** is critical for accelerating feature development that impacts business and scales a successful model. It sets proper priorities. I list it last because it is not critical. The system works without it. It’s needed when pursuing ambitious growth with sufficient resources. This is not a management task, but an architect-level task.

* **Prioritizing backlog tasks** can vary. In SCRUM, the team sets priorities in planning meetings; in traditional models, the team lead does. Inconsistent leadership leads to no priorities at all. Clear rules teach people to focus on more important tasks and feel significant.

* **Regular meetings, reporting, and attention** help team members feel they are doing the right thing, part of something bigger, and help survive crises.

---

## So, How Long Does It Take to Build a Web Service?

Often, the answer is: "Use WordPress, like 38% of websites on the internet." Many times, the problem can be solved without programmers. You can use SaaS, off-the-shelf solutions, or outsourcing—unless you’re building an IT business. By Lehman’s law, software development must continue throughout the product’s life. As business grows, management and operational processes appear, architecture tasks, business analysis, legal, accounting, financial processes, PR, corporate rules.

What if you just write code without plans, tests, or trackers, just call and discuss along the way? Developers might get the task right, or you might have to replace them several times and rewrite the app repeatedly. The difference is in predictability of results.

[Originally written [in Russian](https://habr.com/ru/articles/522102/)]

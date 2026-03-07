> Humans invent a new hype cycle every six months and then act shocked when physics and probability still exist. Same  story with AI agents. 

— *ChatGPT about this note*

For many programmers, coding with LLMs feel unreliable, suitable only for simple tasks.

I write this note after having coding assistants implement a large and complex task for me.
They converted my desktop GUI application for speech recognition to a client-server architecture.

In one week I have:

* separate client and server applications
* a non-blocking WebSocket server running in a thread alongside speech recognition
* a binary protocol designed, documented and implemented
* client session management
* multiplexing of multiple audio streams from clients into a shared neural model

For most of the task, the assistant ran for about an hour in a single session, staying within the €20 "Pro" plan limits and producing a git commit with 10,013 lines of changes. Basically, for free.

Let me explain how it works.

### What Agents Are

In 1986, cognitive scientist Marvin Minsky published the book The Society of Mind. He proposed a radical idea: the human mind is not a single intelligent system but a society of simple processes called *agents*.

Each agent is specialized and relatively mindless on its own. Intelligence emerges from their negotiation, confrontation, and cooperation.

Forty years later, modern AI assistants recreated this idea in software engineering.

Systems like ChatGPT, Claude, and OpenClaw rely on multi-agent architectures.

### Core Mechanics

Agent-based assistants follow several principles that map to Minsky’s theory.

**1. Radical specialization**

Coding assistants split work between multiple agents:

* Planner
* Researcher
* Coder
* Documentation library, usually Context7

Each agent performs one narrow task.

**2. The blackboard**

Agents exchange information through files in shared folders: task documents, todo plans, notes.
This is essentially the classical “blackboard”.

**3. Constructive conflict**

Agents evaluate possible solutions, argua, and check one another. Minsky argued that intelligence often emerges from competing goals inside the system.

In practice this appears as thinking mode in planning agents, coding agents try different solutions when they stuck, and review agents criticizing the result.

**4. Hierarchical orchestration**

Most agentic systems include a coordinator: a manager agent that decides which agent should act next and merges their outputs.

### Limitations of LLM agents

Engineers struggle to use LLMs for complex solutions for a fairly simple reason: the LLMs are unreliable in ways that matter. They have a [complexity high-cap](/?What-LLMs-Are-Not) by design.

LLMs regularly:

* miss dependencies
* modify the wrong files
* ignore instructions
* invent APIs that do not exist

Assistants with multi-agent orchestration reduce failures and improve reliability, but they do not eliminate limitations of underlying LLMs.

### Solution: Software Development Life Cycle

The process of any system development follows a natural order of phases.

To make assistants work reliable I following the traditional [Software Development Lifecycle](https://en.wikipedia.org/wiki/Systems_development_life_cycle). 

The phases are:

1. Requirements definition
2. Analysis and design
3. Implementation and deployment
4. Sustainment - metrics and support

Coding assistants are useful almost exclusively in **phase three**.

LLMs can not define requirements. And they can not design systems.

They are very helpful in research and proofreading documents, but the architecture and solution design remains with the engineers.

In my case I spent **five days** writing a [solution document](https://github.com/grikdotnet/ai-stenographer/blob/6-client-server/PLAN.md). After that, the [implementation](https://github.com/grikdotnet/ai-stenographer/commit/5677926ba6f86314f786e2c80cc48451bb17e241) took **hours** using agents like Claude Code and Codex.

### Roots of the struggle

People are used to save on design and analysis, and heavily invest in coding.
I was a single architect in a company with fifty coders and operations technicians, and one of 3 architects in a project with 120 coders.

Companies hire coders to execute product decisions directly, leaving architecture and specification work implicit. With this team structure nobody can use coding assistants efficiently.

Coding assistants do not change the process, they change structure and budgeting.

### The Myth of Context

There is a persistent myth in the AI community: *“Context is king.”*
The idea is that agents fail because they lack enough context.

Reality looks almost opposite.

Being radically specialized, agents work best with **narrow tasks and limited scope**.

An agent can either:

* analyze existing code, or
* write new code

Mix both in a single session, and the model drifts, hallucinate, or forget instructions.

Large context windows do not magically fix this. In fact, the more text you feed into an LLM, the more likely it is to ignore instructions and miss details.

### What Actually Works

1. I design the architecture and solution myself.
2. A planning agent helps convert that design into a task document listing exact files and methods.
3. A coding agent implements the code changes.
4. A review agent checks the code against the specification.
5. I mediate between them, passing review comments and fixes.

In other words, I act as a manager between unreliable programmers.

Finally, I perform my own code review. That part is not optional. I still need to know details to design solutions for the next tasks.

Nothing magical, just works. About 15,000 lines of code in five days.

It is not coding speed anymore. It is **architecture and problem definition**. Humans still do that part. Machines just debug faster. Convenient for anyone who actually knows how software systems work.

Microservice architecture is widely discussed, but most real systems arrive there after years of growing as monoliths. This article is about the messy middle: working with legacy PHP monoliths and gradually decomposing them into services.

* * *

## Why Legacy Appears

There are several reasons legacy code appears.

New versions of operating systems, languages, browsers, and libraries are constantly released. This problem is especially relevant for mobile applications and scripting languages. With every new platform version, compatibility issues in old code have to be fixed. This process is stable and predictable for years ahead.

Also, technical debt often appears intentionally. Management shortens development time by skipping design, automated testing, or code reviews, and it has good reasons.

Products have a [Llifecycle](https://en.wikipedia.org/wiki/Product_lifecycle), and the period of high demand for popular products lasts about three or four months. Competitors copy the best ideas and make them even better, so companies are forced to release new products regularly. To maintain revenue, new products and new versions are released every few months. Three or four major releases per year are normal for companies like Apple, Marvel, and Oracle.

Most products fail, and companies must release new ones quickly to find something that sells. About 97% of startups discard the work done on their product and try something else. Only a small fraction survive long enough for technical debt to become a problem. 

* * *

## If You Have Legacy Problems — You're Lucky

Problems appear when the product life cycle does not match the [Software Life Cycle](https://en.wikipedia.org/wiki/Systems_development_life_cycle) that supports it. In stable organizations there are usually deadlines for decommissioning old software or upgrading it. In startups, however, the software will most likely never need long-term maintenance. The code is undocumented, fragile, and not scalable.

When a startup finally finds a product that sells better than expected, that product enters the next cycle, and a new version is released. Benefits of long-term software lifecycle planning only become clear after long and significant growth. By that time, the project has already accumulated a large amount of legacy code. Those teams are actually lucky.

* * *

## When Legacy Actually Becomes a Problem

Bad code does not automatically create problems. WordPress is famous for questionable code quality, yet it powers 38% of the web.

Software can run for years without updates if it is isolated from interaction with the outside world. Examples include software in ATMs and stable isolated services inside a service architecture.

So what should those lucky enough to have legacy systems actually do?

* * *

## Start with Testing

Serious code changes always lead to unexpected problems. Without reliable testing, application failures will lead to revenue loss and declining sales.

Before changing a legacy system you must have:

- repeatable release procedure
- rollback mechanism
- acceptance tests for critical API paths

If the project does not have automated acceptance testing, the modernization process should start with training QA engineers and preparing a proper testing strategy.

* * *

## Upgrading the Language Version

Several years after the code is written, it often becomes incompatible with the current language version, which leads to a pile of problems.

New products require third-party libraries that depend on modern platform versions. Old platform versions also stop receiving bug fixes. It becomes harder to hire developers willing to work with outdated language versions. As a result, both the cost of solving problems and the effort required to maintain the system increase.

Static analysis tools can help build a list of compatibility problems with newer PHP versions:

- Rector helps resolve simple compatibility issues automatically by updating parts of the code.
- Exakat analyzes compatibility across PHP versions, lists used extensions, problematic code areas, and helps create a migration task list.
- Phan detects lexical constructs that were removed from newer PHP versions.

If the new language version does not support an extension used in the application, the code that relies on that extension must be rewritten.

In practice, upgrading the platform or language version can be relatively fast. The author initiated a migration from PHP 5 to PHP 7 for a very large codebase, and the team successfully completed the upgrade in three weeks.

* * *

## Moving from a Monolith to a Service Architecture

Sometimes projects simply grow.

Products become successful and continue to be released regularly. According to [Lehman’s Laws](https://en.wikipedia.org/wiki/Lehman%27s_laws_of_software_evolution), software complexity grows, functionality expands, development teams grow, and the codebase constantly increases.

Replacing outdated software is rarely included in the development budget because companies want to improve financial performance. As a result, software quality gradually declines. The size of the Git repository may grow to several gigabytes. Development velocity slowly decreases, and when developers can no longer keep up with product releases, the monolith becomes a candidate for decomposition.

The most fashionable and expensive approach is parallel service development. While the old system continues running, new services are developed in parallel, often in another language such as Go. The main risk is that the new services may never fully replace the old system because requirements keep evolving while development is ongoing.

Fortunately, you can eat the elephant one bite at a time. Instead of rewriting everything, modules can be extracted from the monolith while preserving the existing code. First the APIs are stabilized, then these modules can be turned into independent services.

Moving code into packages provides several advantages:

- The size of the main repository can be reduced.
- Developers from other teams can be given access only to the public APIs of packages while restricting access to internal classes.
- Dependencies between modules can be described using Composer.
- Each module can have its own development lifecycle.
- Multiple versions of packages can exist simultaneously.

Most importantly, extracting a package is not an enormous task. Moving a portion of code into a package without rewriting it can take just a few days. The author once moved around a thousand lines of code per day while inverting external dependencies. After APIs are stabilized, large-scale refactoring becomes much easier.

* * *

## Extracting Packages From a Monolith

Suppose you have a PHP application that provides a client API.

Any changes should start with testing and release procedures that include rollback plans. These processes are commonly called release, control, validation and DevOps.

In actively developed projects, testing and deployment pipelines are already established. In that case, the next step is identifying [bounded contexts](https://en.wikipedia.org/wiki/Domain-driven_design#Mapping_Bounded_Contexts_to_Microservices) that can logically be extracted into modules or services.

For example:

- image processing
- user authentication
- payment processing

Creating a module usually involves five steps:

1. Select a small piece of functionality to extract, such as image resizing.
2. Define the module API by writing an interface accessible to the application.
3. Write or verify acceptance tests.
4. Copy the old code into the module and invert dependencies across the module boundary without rewriting everything.
5. Replace direct calls to the old code with calls to the service provided by the new module.

Two technologies are commonly used for this: an IoC container and a dependency manager.

Once all planned functionality has been moved into the module, the old code can be removed from the application.

Packages can initially be developed in a local Composer path repository. For full-scale builds and deployments, it is better to create a private package repository such as Packeton or use a hosted solution like Private Packagist.

Composer can manage package dependencies, while something like Symfony Dependency Injection can serve as the IoC container.

If the application does not have an IoC container, dependency injection must be implemented as part of the refactoring process.

* * *

## Solving Code Coupling Problems

There are two main types of coupling:

a) code inside the future module references structures defined elsewhere in the application  
b) other parts of the application reference structures that will belong to the module

Let’s examine several common coupling scenarios.

### 1. Class inheritance, interfaces, and traits

When structural declarations cross the future module boundary.

Typical solutions include:

- declaring external libraries as dependencies of the package
- creating a contracts package for shared interfaces
- replacing inheritance with composition via adapters
- exposing protected properties via getters
- exposing protected methods via proxy methods
- inverting inheritance from module classes into composition using services

For small parent classes without dependencies, it may be simpler to copy them into the new package and change the namespace rather than performing heavy refactoring.

* * *

### 2. Static calls

PHP allows static methods to be called using object syntax. When functions or static methods are moved into a package, they must be added to the package’s public API.

Static calls between packages and the application can be replaced with service calls, effectively implementing the Bridge pattern.

If multiple static helpers are used together, they can be grouped behind a facade service.

* * *

### 3. Global constants and class constants

Sometimes a class violates the Single Responsibility Principle by referencing constants from another class.

To extract such a class without refactoring the entire application, the constant reference must be removed.

Possible solutions include:

- introducing an adapter service that exposes constant values
- injecting constants through the IoC container

Injecting constants avoids performance overhead caused by method calls inside loops.

* * *

### 4. Dynamic class resolution using strings

Example:

    $model = new ($modelName . 'Class');

This pattern occasionally appears inside frameworks, but in application code it creates major architectural problems. There is no universal fix. Sometimes it can be replaced with a switch statement and a static class list.

Fortunately, this pattern is relatively rare.

* * *

## Optimization

In large applications, IoC containers may contain hundreds or thousands of services. When dependencies are injected through constructors, the container may instantiate many services that are never used.

Possible solutions include:

1. Lazy services
2. Service Subscribers
3. Splitting APIs into smaller services

Service Subscribers are the most flexible solution because they allow services to be instantiated only when they are actually needed.

* * *

## Service-Oriented Architecture

After splitting the code into packages, everything may still be deployed as a single application running in one process. That is still a monolith.

The transition to service-oriented architecture comes later.

Each package has a defined public API. A service can be created around that API using a REST protocol. The service code consists of the package code plus standard infrastructure such as routing and logging. In the old application, the package code is replaced with an HTTP adapter that calls the service.

When building internal services, two important problems must be solved:

1. **Detailed logging of all service calls.**  
Every client request must receive a unique request ID that propagates through all internal service calls.
2. **Ensuring idempotency.**  
If a request is retried after a service failure, it must not produce duplicate results. For example, a repeated payment request must not transfer money twice.

* * *

## Conclusion

Decomposing a monolith is a long process of isolating modules, stabilizing APIs, and gradually moving boundaries. Extracting packages inside the monolith is often the safest first step toward a service architecture.

[written in 2021]
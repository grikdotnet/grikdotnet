![RealDream Lightning](/what-llms-are-not.jpg)

["Attention is all you need"](https://arxiv.org/abs/1706.03762) they wrote in 2017, and introduced a transformer architecture implemented in LLMs.
The ["The Parallelism Tradeoff: Limitations of Log-Precision Transformers"](https://aclanthology.org/2023.tacl-1.31/) article in 2023 described transformers' constraints.

In a theory transformers are Turing-complete, which means they can solve any computational task. But there are 2 major assumptions: infinite precision, and arbitrary size of models. The limits of computer memory and precision in chips are set in stone. Long story short, there are tasks that transformer LLMs can not solve.

### Main limitation.

In programming we are used to the binary logic: AND, OR, NOT, and others, called "gates". They are used to implement operators like IF and FOR loops that are used to branch execution and define the logic of applications.

LLMs are just different. They use parallel computing. Instead of a binary logic, the major logical operation is called a "self-attention function". Self-attention functions are a bit like finite state machines. An over-simplified algorithm is like this. Each word from the user input is replaced with a set of numbers according to a dictionary, making tokens. An attention algorithm creates matrixes for pairs of tokens in all combinations. Tokens are multiplied with internal matrixes, and with each other in pairs. A result of a self-attention function for each token is some kind of a sum of all computations in all pairs. This result is chained to an Activation function that cuts off "non-relevant" relations. A group of self-attention functions with other routines like normalization and a feedforward network create a Layer.

The self-attention layers in a loose meaning are similar to promises in Javascript. They are stacked one after another in an execution chain. In a theory, a loop can be rewritten as a chain of promises. The same way different logic is implemented with chained self-attention layers. The execution of an attention layer is parallelized to a very high degree, and runs in constant time. This is achieved with a straightforward logic, with no loops and no conditions, making layers large in size. It works, unless the size of a data set does not exceed the length of a chain, and the program size does not exceed the amount of memory.

There are no jump instructions for a control flow as well. The self-attention mechanism allows for dynamic and non-sequential information flow. Models can logically "jump" between tokens in the sequence based on learned attention patterns, focus on relevant information and bypass irrelevant parts, but the computation through attention layers always stays the same. 

In transformer LLMs attention layers are hard-coded. This imposes a limitation on complexity of the logic that can be implemented. The are more than 100 layers in modern LLMs, and operations it implements are pretty complex, but the logic is always straight.

A basic example of the task beyond the limitation is to count the number of letters in a word. Most of LLMs tell that there are two "r" in "strawberry".

Developers of LLMs approach limitations in different ways. The main approach is to hard-code more procedures for more possible tasks. Attention layers are split into multiple "spaces", and LLMs may run separate "heads" in "spaces" dedicated to particular tasks, where the solution is implemented. As an example, when I ask a Claude Sonnet to count the number of "R"s in "strawberry", it finds two. But when I ask it to think step by step, it runs a different algorithm, takes each letter of a word as a token, and counts tree.

Researches [keep searching](https://arxiv.org/abs/2405.18512) for tasks that can be solved with transformers, and LLM developers keep adding up layers and heads, implementing algorithms for more tasks.

### Second limitation.
It is size. One could suggest that implementation of all popular algorighms for all kinds of tasks could be a solution. Unfortunately, there is a tradeoff between number of heads versus the size and the speed of the model. Let's take GPT 3 as an example. It has 96 heads. Each head computes a part of a token, 128 numbers. So, a whole token consists of 12288 numbers or dimensions. A matrix of an attention mechanism contains 12288 x 12288 / 96 = 1 572 864 numbers, per head. An activation network matrix is 4 times bigger. To add many more heads for algorithms you have to increase the size of tokens, or make a worse representation of a token. The GPT 3 model with 175 billion parameters in 16 bits needs 350 GB of memory. Simply doubling the number of heads and size of tokens would make the model grow in 4 times, require 1.4Tbytes of memory to run, would make it 4 times slower, and that is quite costly. Developers of LLMs have to choose which algorithms to add, so the balance is critical.

There are many approaches to this tradeoff, including [Distillation](capabilities), which means preparing smaller models for specific tasks, mixed size of tokens, and quantization.

### Third limitation.
Float operations introduce errors of precision. The cost of GPUs forces people to cut down the precision. The self-attention algorithm does a great job predicting relations of tokens, like letters in a word, pixels in a picture. But when you deal with a set of unrelated values, like digits in numbers, smaller floats precision increases the probability of errors in self-attention. Qualcomm engineers have been advocating for the use of integer arithmetic over floating-point arithmetic when implementing LLMs, claiming the reduced memory requirements, power consumption and better performance. But we are not there.

An approach to solve recognized tasks suffering from errors in float operations is remote procedures calls. Open AI named it a "function calling", but in fact it generates an RPC message. For example, when you ask ChatGPT to count 2+2, it generates and executes a python code.

### Impact
How this affects us is the way we should and should not use an LLM. If we ask it to generate some code that shows a button on a page, attach a callback handler, refactor some code, generate tests or translate to another language, LLM will handle that. But if you want a short class for a Data Transfer Object that describes relationship of several bounded entities, you are on your own. If you need to process a stream of incoming data, you can split it and process each part with an LLM separately. But the tasks that involve conditions or loops, math operations, composite entites, should be decomposed.

Will GPTs replace ecommerce web sites? Might be. Can LLMs replace a CRM or a document flow solution? No, LLMs will be a part of it. Architecturally an LLM is a stateless backend service. It needs a middleware adapter service that will add a state by connecting an LLM with some database or storage. A system of an LLM with a vector database and a middleware is called RAG. The middleware should also provide connection with a message bus to implement function calling, to obtain tasks from a queue and return results. This way it will become a part of a solution with unlimited complexity.
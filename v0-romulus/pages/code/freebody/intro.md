<% 
    this.layout = 'post'; 
    this.category = 'code';
	this.title = 'What is Freebody?';
    this.project = 'Freebody';
    this.source = 'https://github.com/timhall/freebody.js';
    this.date = 'Nov. 30, 2012';
    this.author = 'Tim Hall';
%>

Freebody is invisioned to be a very simple library for implementing basic physics, the kind you would see in free body diagrams. 

#### So what does it do? 

- Apply forces, acceleration, and velocity to a body and figure out how the body moves as a result
- Move a body through time, whether it be just a split second or many seconds into the future

#### Cool, so what doesn't it do? 

Collisions, bouncing, and all those fancy things that the big guys do. Currently, a body is treated as a point mass so it doesn't have a boundary for determining collisions and has limited information about the other bodies in the environment. By focusing on fundamental physics of a body, for working with things like projectiles and orbit, Freebody avoids the expensive operations of determining collisions with the goal of a fast and efficient library.

#### Ok...then what's the point?

1. An attempt at a lightweight physics library that was designed and built for javascript
2. Fun! It should be an interesting learning experience

### Keep reading

1. What is Freebody?
2. [Vectors Everywhere](./vectors)
3. [What's a Body?](./body)
4. [Experiments with Lightweight Vectors](./experiments)
5. [The New Kid's Perspective](./perspective)
6. [Does the Math Work?](./math)

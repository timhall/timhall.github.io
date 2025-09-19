---
title: Vectors Everywhere
slug: vectors
publishedAt: 2012-11-27T00:00:00Z
updatedAt: 2018-06-01T00:00:00Z
---

Vectors are one of the most fundamental parts of physics and are a compact way to say quite a bit.Forces, velocity, acceleration; they can all be represented by vectors. We'll get into the math of vectors below, but first a little overview. Fundamentally, vectors are used to represent things (forces, velocity, etc.) as having a magnitude and direction and from this we can figure out all sorts of things. Rather than adjusting x- and y-components with a change in direction, only the direction needs to be changed and similarly for magnitude. Two things can say quite a bit, it's kinda nifty.

Note, June 2018: Updated code samples to modern standards

## Code

So what does this look like in code?

```js
var force = new Vector();
force.magnitude(2);
force.angle(45);
force.x(); // = sqrt(2)
force.y(); // = sqrt(2)
```

```js
const force = new Vector();
force.magnitude = 2;
force.angle = 45;
force.x; // = sqrt(2)
force.y; // = sqrt(2)
```

Nice and simple. There are only four properties for the Vector class and of these only two are instance properties, magnitude and angle, as x and y can be calculated from magnitude and angle. With Vectors strewn throughout Freebody, it was essential to keep the Vector class as focused and efficient as possible. Here's a stubbed out version of the Vector class (you can find the full class in the [timhall/freebody.js source>(https://github.com/timhall/freebody.js)):

```js
var Vector = function (magnitude, angle) {
  // Magnitude and angle are the only instance properties
  this._magnitude = magnitude;
  this._angle = angle;

  return this;
};

// Add getters/setters to prototype
// so that they are shared by all Vectors
Vector.prototype = {
  magnitude: function (value) {},
  angle: function (value) {},
  x: function (value) {},
  y: function (value) {},
};
```

```js
// ES6 alternative
class Vector {
  constructor(magnitude = 0, angle = 0) {
    this._magnitude = magnitude;
    this._angle = angle;
  }

  get magnitude() {}
  set magnitude(value) {}

  get angle() {}
  set angle(value) {}

  get x() {}
  set x(value) {}

  get y() {}
  set y(value) {}
}
```

Some things to note:

1\. Why not pass the traditional `options` argument into the class?

Something to keep in mind during javascript game development is that while js engines have gotten much faster, garbage collection can rear its ugly head and be a real frame-rate killer. One of the best ways to limit the aggressiveness of garbage collection is avoiding creating new objects in the event loop (which includes anything created with `new`, `{}`, and `[]`). Say you've determined that you have to create a new Vector during the event loop and chose the `options` style.

```js
new Vector({ angle: 45 });
```

```
What is not immediately obvious is that this line actually creates two objects, one from the `new` and one from the `{}`. These throwaway objects, especially those created with `{}`, can start to add up and are ripe for garbage collection. Switching to named arguments is a quick way to cut object creation in half for the Vector class.
```

2\. Why have getters/setters for magnitude and angle if they are simple properties?

```
This was mainly to cut down on confusion from having some properties requiring the `()` and others not. Since the getter/setter is defined in the function prototype and is therefore shared with all Vectors, there should be minimal increased overhead from adding them.
```

### Getters and Setters

The getter and setter methods for all four properties follow a simple structure (although x and y have different internals as we'll see in just a sec):

```js
property: function (value) {
  if (value !== undefined) {
    // Setter
    this._property = value;

    // Return parent for chaining
    return this;
  } else {
    // Getter
    return this._property;
  }
}
```

By returning the parent in the setter method, you can chain set methods together for jQuery-style convenience:

```js
var force = new Vector().x(1).y(2); // Force is a vector with x and y set
```

```js
// (alternative, although not quite as pretty)
const force = new Vector();
force.x = 1;
force.y = 2;
```

## Vector Math

Now to get a little into the nitty gritty of vector math. One of the things that make vectors so attractive is that they can be simply thought of as triangles and by then applying basic trig we can figure out all of the necessary properties. So let's see what this looks like:

1. We have a vector with a defined magnitude and angle
2. In order to determine the x- and y-components, we treat the magnitude as the hypotenuse of the triangle
3. With the triangle drawn, we can simply use sin and cos to find the x- and y-components:

   $$
   \begin{aligned}
   x & = magnitude \times\cos(angle) \\
   y & = magnitude \times\sin(angle)
   \end{aligned}
   $$

Let's plug this in:

```js
x: function (value) {
  if (value !== undefined) {
    // We'll cover this in a sec
  } else {
    return this._magnitude * Math.cos(this._angle);
  }
},
y: function (value) {
  if (value !== undefined) {
    // We'll cover this in a sec
  } else {
    return this._magnitude * Math.sin(this._angle);
  }
}
```

```js
// (alternative)
class Vector {
  get x() {
    return this._magnitude * Math.cos(this._angle);
  }

  get y() {
    return this._magnitude * Math.sin(this._angle);
  }
}
```

### Setting x- and y-components

Setting the magnitude and angle based on the x- and y-components requires a little more finesse and we have to ask ourselves what the desired behavior is for setting the remaining properties. The issue is, the vector needs two properties in order to be defined (it doesn't matter which two, just two). So when setting one component of the vector we have to choose one of the three remaining properties, keep it fixed, and adjust the remaining two properties. When setting the x-component, should we keep the y-component, magnitude, or angle fixed?

My vote for what is the expected behavior is to keep the opposite component fixed and adjust the magnitude and angle. By setting the x- or y-component, it is expected that the magnitude and angle are intrinsically going to change. Using the pythagorean theorem and a little more trig:

$$
\begin{aligned}
magnitude & = \sqrt{x^2 \times y^2} \\
angle & = atan(y/x)
\end{aligned}
$$

So let's finish up the Vector class:

```js
x: function (value) {
  if (value !== undefined) {
    setMagnitudeAndAngle(this, value, this.y());
    return this;
  } else {
    return this._magnitude * Math.cos(this._angle);
  }
},
y: function (value) {
  if (value !== undefined) {
    setMagnitudeAndAngle(this, this.x(), value);
    return this;
  } else {
    return this._magnitude * Math.sin(this._angle);
  }
}

// (Keep it DRY)
var setMagnitudeAndAngle = function (vector, xValue, yValue) {
  vector._magnitude = utils.hypotenuse(xValue, yValue);
  vector._angle = Math.atan2(yValue, xValue);
}

// utils.js
utils.hypotenuse = function (x, y) {
  return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
};
```

```js
// (alternative)
class Vector {
  set x(value) {
    setMagnitudeAndAngle(this, value, this.y);
  }

  set y(value) {
    setMagnitudeAndAngle(this, this.x, value);
  }
}

function setMagnitudeAndAngle(vector, x, y) {
  vector._magnitude = utils.hypotenuse(x, y);
  vector._angle = Math.atan2(y, x);
}
```

You may notice the `atan2(y, x)` function call. This is used to overcome a natural limitation in atan, where the direction of the resulting angle may be skewed for negative x-values ([Read More](http://www.khanacademy.org/math/trigonometry/v/inverse-trig-functions--arctan)).

## All finished

And with that, our vector class is complete (with only a few things, such as keeping the angles in degrees, left out for brevity). You can view the entire source at [timhall/freebody.js](https://github.com/timhall/freebody.js).

## Tips

- [How to write low garbage real-time JavaScript](https://www.scirra.com/blog/76/how-to-write-low-garbage-real-time-javascript)
- [Trig Refresher](http://www.khanacademy.org/math/trigonometry)

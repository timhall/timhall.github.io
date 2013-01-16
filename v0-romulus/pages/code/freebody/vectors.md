<% 
    this.layout = 'post'; 
    this.category = 'code';
	this.title = 'Vectors Everywhere';
    this.project = 'Freebody';
    this.source = 'https://github.com/timhall/freebody.js';
    this.date = 'Nov. 27, 2012';
    this.author = 'Tim Hall';
%>

(Vector picture)

Vectors are one of the most fundamental parts of physics and are a compact way to say quite a bit. Forces, velocity, acceleration; they can all be represented by vectors. We'll get into the math of vectors below, but first a little overview. Fundamentally, vectors are used to represent things (forces, velocity, etc.) as having a magnitude and direction and from this we can figure out all sorts of things. Rather than adjusting x- and y-components with a change in direction, only the direction needs to be changed and similarly for magnitude. Two things can say quite a bit, it's kinda nifty. 

### Code

So what does this look like in code?

<pre class="sunlight-highlight-javascript">var force = new Vector();
force.magnitude(2);
force.angle(45);
force.x(); // = sqrt(2)
force.y(); // = sqrt(2)</pre>

Nice and simple. There are only four properties for the Vector class and of these only two are instance properties, magnitude and angle, as x and y can be calculated from magnitude and angle. With Vectors strewn throughout Freebody, it was essential to keep the Vector class as focused and efficient as possible. Here's a stubbed out version of the Vector class (you can find the full class in the [source](<%= this.source %>)):

<pre class="sunlight-highlight-javascript">var Vector = function (magnitude, angle) {
    // Magnitude and angle are the only instance properties
    this._magnitude = magnitude;
    this._angle = angle;

    return this;
}

// Add getters/setters to prototype 
// so that they are shared by all Vectors
Vector.prototype = {
    magnitude: function (value) {
        
    },
    angle: function (value) {
        
    },
    x: function (value) {
        
    },
    y: function (value) {
        
    }
}</pre>

Some things to note:

1.  Why not pass the traditional `options` argument into the class? 
    
    Something to keep in mind during javascript game development is that while js engines have gotten much faster, garbage collection can rear its ugly head and be a real frame-rate killer. One of the best ways to limit the aggressiveness of garbage collection is avoiding creating new objects in the event loop (which includes anything created with `new`, `{}`, and `[]`). Say you've determined that you have to create a new Vector during the event loop and chose the `options` style. 
    
    <pre class="sunlight-highlight-javascript">new Vector({ angle: 45 })</pre>

    What is not immediately obvious is that this line actually creates two objects, one from the `new` and one from the `{}`. These throwaway objects, especially those created with `{}`, can start to add up and are ripe for garbage collection. Switching to named arguments is a quick way to cut object creation in half for the Vector class.

2.  Why have getters/setters for magnitude and angle if they are simple properties?

    This was mainly to cut down on confusion from having some properties requiring the `()` and others not. Since the getter/setter is defined in the function prototype and is therefore shared with all Vectors, there should be minimal increased overhead from adding them.

#### Getters and Setters

The getter and setter methods for all four properties follow a simple structure (although x and y have different internals as we'll see in just a sec):

<pre class="sunlight-highlight-javascript">property: function (value) {
    if (value !== undefined) {
        // Setter
        this._property = value;

        // Return parent for chaining
        return this;
    } else {
        // Getter
        return this._property;
    }   
}</pre>

By returning the parent in the setter method, you can chain set methods together for jQuery-style convenience:

<pre class="sunlight-highlight-javascript">var force = new Vector().x(1).y(2); // Force is a vector with x and y set</pre>

### Vector Math

Now to get a little into the nitty gritty of vector math. One of the things that make vectors so attractive is that they can be simply thought of as triangles and by then applying basic trig we can figure out all of the necessary properties. So let's see what this looks like:

(Vector Picture)

1.  We have a vector with a defined magnitude and angle
2.  In order to determine the x- and y-components, we treat the magnitude as the hypotenuse of the triangle
3.  With the triangle drawn, we can simply use sin and cos to find the x- and y-components:
    `\[\begin{aligned}
    x & = magnitude \times\cos(angle) \\
    y & = magnitude \times\sin(angle)
    \end{aligned} \]    `

Let's plug this in:

<pre class="sunlight-highlight-javascript">x: function (value) {
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
}</pre>

#### Setting x- and y-components

Setting the magnitude and angle based on the x- and y-components requires a little more finesse and we have to ask ourselves what the desired behavior is for setting the remaining properties. The issue is, the vector needs two properties in order to be defined (it doesn't matter which two, just two). So when setting one component of the vector we have to choose one of the three remaining properties, keep it fixed, and adjust the remaining two properties. When setting the x-component, should we keep the y-component, magnitude, or angle fixed?

(Choices picture)

My vote for what is the expected behavior is to keep the opposite component fixed and adjust the magnitude and angle. By setting the x- or y-component, it is expected that the magnitude and angle are intrinsically going to change. Using the pythagorean theorem and a little more trig:

`\[\begin{aligned}
magnitude & = \sqrt{x^2 \times y^2} \\
angle & = atan(y/x)
\end{aligned} \]`

So let's finish up the Vector class:

<pre class="sunlight-highlight-javascript">x: function (value) {
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
    vector._angle = Math.atan2(y, x);
}

// utils.js
utils.hypotenuse = function (x, y) {
    return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
};</pre>

You may notice the `atan2(y, x)` function call. This is used to overcome a natural limitation in atan, where the direction of the resulting angle may be skewed for negative x-values ([Read More](http://www.khanacademy.org/math/trigonometry/v/inverse-trig-functions--arctan)).

### All finished

And with that, our vector class is complete (with only a few things, such as keeping the angles in degrees, left out for brevity). You can view the entire source [here](https://github.com/timhall/freebody.js).

### Tips

- [How to write low garbage real-time Javascript](https://www.scirra.com/blog/76/how-to-write-low-garbage-real-time-javascript)
- [Trig Refresher](http://www.khanacademy.org/math/trigonometry)

### Keep reading

1. [What is Freebody?](./intro)
2. Vectors Everywhere
3. [What's a Body?](./body)
4. [Experiments with Lightweight Vectors](./experiments)
5. [The New Kid's Perspective](./perspective)
6. [Does the Math Work?](./math)
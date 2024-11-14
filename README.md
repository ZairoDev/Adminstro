<!-- 

Formated way of doing things

1. JavaScript Execution Context
JavaScript code is executed in two primary phases within an execution context:

Memory Creation Phase: During this phase, JavaScript allocates memory for all declared variables and functions. Each variable is initially assigned a value of undefined as a placeholder.

Code Execution Phase: In this phase, JavaScript assigns the actual values to the variables. For example, if var n = 2, n is updated to hold the value 2.

Nested Execution Contexts
When functions are invoked, JavaScript creates a brand-new execution context for each function, following the same memory allocation and execution steps.

2. Call Stack
The call stack is a data structure that JavaScript uses to keep track of function calls. It follows these steps:

Initially, the global execution context is pushed onto the stack.
Each new function call creates a new execution context that is pushed onto the stack.
Once a function completes, its execution context is removed from the stack.
The call stack enables JavaScript to manage multiple function calls and is emptied when all functions have finished executing, leaving only the global context.
3. Hoisting
Hoisting is JavaScript's behavior of moving variable and function declarations to the top of their scope before execution.

Example:

javascript
Copy code
getName(); // "Hello" (due to hoisting)
console.log(x); // undefined
var x = 7;

function getName() {
  console.log("Hello");
}
undefined: Indicates that memory has been reserved for a variable, but it hasn't been assigned a value.
not defined: Refers to a variable that has not been declared at all.
Arrow Functions: In the case of arrow functions, hoisting treats them like variables, so they are not accessible before their definition.

4. Types of Functions in JavaScript
Function Types
Function Statement (Declaration):

javascript
Copy code
function a() {
  console.log("A called");
}
Function Expression:

javascript
Copy code
var b = function() {
  console.log("This is a function expression");
};
Anonymous Function: A function without a name, often used as a value.

javascript
Copy code
var a = function() {
  console.log("I am an anonymous function");
};
Named Function Expression:

javascript
Copy code
var b = function name() {
  console.log("This is a named function");
  name();
};
Parameters vs. Arguments
Parameters are placeholders in the function definition, while arguments are actual values passed to the function when called.
First-Class Functions
JavaScript allows functions to be treated as values, a feature known as first-class functions. This means functions can be passed as arguments, returned from other functions, and assigned to variables.

5. Difference Between undefined and not defined
undefined: A variable is declared but not yet assigned a value.
not defined: A variable is neither declared nor assigned.

6. Scope in JavaScript
Types of Scope
Scope defines where variables can be accessed in JavaScript:

Global Scope: Variables declared outside of any function are in the global scope.
Function Scope: Variables declared within a function are accessible only within that function.
Lexical Environment and Scope Chain
Each function has a lexical environment, which includes its private memory and the lexical environment of its parent. The scope chain is a chain of lexical environments that JavaScript follows to find variable references.

Example:

javascript
Copy code
function a() {
  console.log(b);
}
var b = 10;
a(); // Output: 10 (due to lexical scoping)


7. Difference Between let, const, and var
var: Hoisted to the global scope, accessible throughout the function where it is defined.
let: Block-scoped, in a temporal dead zone until initialized.
const: Block-scoped, must be initialized at declaration, and cannot be reassigned.
Temporal Dead Zone (TDZ)
Variables declared with let and const are in the TDZ until they are initialized, where accessing them results in a ReferenceError.

8. JavaScript Blocks and Scope
A block in JavaScript (enclosed in {}) groups multiple statements and can define its own scope.

Example:

javascript
Copy code
{
  const a = 10;
  var b = 20;
  let c = 30;
}

Shadowing
When a variable declared within a block has the same name as a variable in the outer scope, the inner variable shadows the outer variable.

9. Closures in JavaScript
A closure is a function that retains access to its lexical scope, even when the function is executed outside that scope.

Example:

javascript
Copy code
function x() {
  var a = 7;
  function y() {
    console.log(a);
  }
  return y;
}
let closure = x();
closure(); // Output: 7

10. setTimeout
The setTimeout function in JavaScript delays the execution of a function by a specified time. After the delay, it executes the function asynchronously.

Example:

javascript
Copy code
setTimeout(() => {
  console.log("This runs after 1 second");
}, 1000);

11. Difference Between Function Statement and Expression
Function Statement (Declaration): Declares a function with a name and is hoisted.
Function Expression: Assigns an anonymous or named function to a variable and is not hoisted.

12. Error Types
Reference Error: Occurs when accessing a variable in the temporal dead zone or one that doesn't exist.
Type Error: Occurs when a variable or parameter is not of a valid type.
Syntax Error: Occurs when code is written with improper syntax.

13. JavaScript Block Scope and Shadowing
JavaScript uses block scope to group statements. Variables declared with let and const within a block are scoped to that block, while var ignores block scope.

Example of Block and Shadowing
javascript
Copy code
var a = 10;
{
  let a = 20; // shadows the global `a`
  console.log(a); // Output: 20
}
console.log(a); // Output: 10

14. First-Class Functions
Functions in JavaScript are first-class citizens, meaning:

They can be passed as arguments to other functions.
They can be returned as values from other functions.
They can be assigned to variables or stored in data structures.


 -->






## JavaScript 101

#### Everything in javascript happend inside execution context

#### everything is running in js is run line by line we make it , async

<!--
Question No: 1 ==>  How code is executed in js
var n = 2;
  function squore (num) {
     var ans = num * num;
     return ans;
   }
 var square2 = squore(n);
 var square3 = squore(n);

 first fase => it

 execution context created in two phases
    memory creation phase ===> Alocate the memory for every variable and it give [undefined:kinf of placeholder] first
    code execution phase  ===> it gives the value into variable like if the value of n = 2 it give n=2 in code execution phase
    Ans then if there is another function that again brandnew execution context code created with the same value

 Question No: 2 ===> What is callstack

 it is a stack in bottom we have global execution context at initiall
 when the new execution context created it push into the stack , after that again if there than that again push into stack call stack manages the execution context , after all the execution call stack has gone with the global variable

 What is Hoisting in javascript


 getName(); you are able to acess these variable because of hoisting
   console.log(x);
    var x=7;
      function getName () {
        console.log("Hello")
}
 before running the propgram , in memory it take place

 notdefined ===> it means that there is no value or we have not reserve the memory for that variable that you trying to acess

 undefined ===> it means that the memory hasbeen taken the variable that you trying to access but the value it not there

 if it is a arrow function than in that case it behave like a variable.
 Apart from anyother language , in js we can access the variable before declaring it.
 after this line you can start with the explanation how hoisting works and all these things


Question No: 3===> Functions in javascript type of functions and

var x = 1;
a();
b();
console.log(x);
 function a(){
   var x = 10;
   console.log(x)
 }
 function b(){
   var x = 100;
   console.log(x)
 }
why ===> global execution contex craeted at first
memory                code
x=undefined;          var x =1;
a = function code      execution context for function a
                        same thing happen
                           memory                    code
b = function code
                        execution contex for function b
                           memory                    code


Question No: 4 ===>

Shortst javascript program is empty file of js
   it create the global execution and run all the things behind the things it create a program like
    window and it also have this keyword , but at the gloabl level this point to window

   There is alway global file created in diffrent formalt in node things are diffrent in the js pure file things are  diffrent but execution contex is always there.

   var a  = 10;  ===> This is in a global space

   function () {
     const a = 10; ===> This is not in global space
     some opration
     return that operation;
    }

   The above function also in global space but not the variable that is in that function
   Any variable that is not in function is in global space , what does it mean.


   Question No: 5 ===> What is the diffrence between undefined and not defined


   undefined mean that js have given the memory for the variable but you are trying to access the variable value before definding it then you will get the error

   if variable not exixts and you are trying to aceess it , then in that case that value gives you a  notdefined

    


   Question No : 6 ===> Scop in js

   function a() {
     console.log(b)
    }
   var b = 10;
   a();
   Out put ===> 10 Some how function getting the value of b


   where you can acess the variable it called scope meaning if variable is aceessble or not in that space
   it depends of lexical envoirment

   Whenever execution context is created lexical envoirment is also created , 
   lexical envoirment ------ means private memory and lexical envoirment of the parent
   scopechanin is the chain of lexical envoirment

   Question No : 6 ===>  Dirrence between , let , const , var

    let , cont declration are hoisted , these are in temporal dead zone for time being

    In case of var it puts into global scope but in let it make it save in seprate memmory space 
    Since then when let variable wads hoisted and till it is inslise some value , this time called temporal deadzone

    when you try to access a variable in temproral deadzone it gives a refrence error, 

    const ===> it will not allow you to declarec first than letter on put the value inti jst like  let

    
    Refrence error ==> when js try to find out specific variable and you can not access it in that case it gives 
    a refrence error.
    console.log(a)
    let a = 10;
    consoel.log(x) also gives the refrence error !

    Type Error  ==> it means you are trying to assiging the another value 
    const a =20;
    b=30;

    Syntex error ==>   const b ; ==> give syntas error 
    let a 100;
    let a = 1000;  ==> gives syntax error

    use const whenever you dont want to reasign the value into that variable again


   Question No : 6 ===> what is the block on javascript

   block , scopr and shadowing...

   {
     This is a block its a compound statement , it combined multiple js statement into a group,
        for making the block so that we can use it where javascript expects one statement.
   }

   if(true) ==> syntax error beacuse it needed a one statement.
   
   if(true){
    const a = "Aman"
    const b = "Trivedi" ===> for thises things to wrap into one we create a block , so that these statement wrapedup
    console.log(a , b)
   }

 
    {
     const a =10;
     var b = 20;     ===> you can not access the var and cont after this block that it called block scope. 
     let c = 30;
    }

  shadowing in javascript
  var a = 10;
 {
     const a =10;
     var b = 20;    . 
     let c = 30;
 }
console.log(a) ===>10 because of shadowing
        when you run abter ecuting the whole code at last b will tunr into 20 again because it uses the same memory address.

 Question No : 7 ==> closures in Javascript

  function x() {
    var a = 7;
      function y() {
         console.log(a)
      }
      y();
  }
  x();
 
 A function bind togethre to it lexical scope is forms a closuers,

 Clouser i need to learn

 Question No : 8 ===> SetTimeOut()

 SetTime out take the function attch the function , and store time in other place after that time it print the value 
 
 Question No : 9 => What is the firstclass function

a();
  it will called
b();
   it gives error TypeError

 Function Statement OR Function Declaration =====
    function a() {
        console.log("A called)
    }
 Function Expression ====
  var b =  function() {
      console.log("This is function expression")
   }

Anonyms function ====> Used in a place where function used as a values

Does not have there own identity

var a = function() {
   console.log("Hello i am anonyms function)
}

var b = function name(){
  console.log("Beacuse function has a name thats why its name is named function)
   name();
 }
  
That does not mean that you can use name after it not it only available to its scope  

Argument ===> values pass inside the functiuon called argument === nameofatheFunction(1 ,2)

Parameter function(params 1  , paramss 2 )  ===> this is paramenter in function 

First class function ===> The ability to use function as a value is called a first class function


Functions are firstcall citizens ===>

   it means the samething like first class function


 Question No : 15  ===> 

   function x() {
      y(); ===> Callback function
    }

  Callback function ===> Take a function and passes into another function that is called a callback function;


  how it work in async task ===>

  setTimeout(function y(){
     console.log("Callback function)
  }, 1000)

It does not wait here to 1 sec to expire , because it does not wait for that time , 
it runs the otherthings and clear the callkstack after given timen it again comes and perform the opration 
that given into the setTime out.

closure along with the event listners

let count  = 0;



Why we have to remove evenlistners , 
   these are heavy , it form the clouser .




Eventloop.

function a() {
    clg("a");
  }
a();
clg("end")



console.log("Start")

setTimeout(()=>{
     console.log("Callback called)
 },[4000])

Promises and mutation observer goes into microtask queue.
All other things goes into call back queue.
 


Starvation problem in callback queue...





 -->

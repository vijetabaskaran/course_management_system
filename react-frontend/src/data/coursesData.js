/**
 * EduPortal — coursesData.js
 * Domain definitions & comprehensive 5-unit curricula with 5-question quizzes per unit.
 */

export const LEARNING_DOMAINS = [
  { id: 'python', name: 'Python', icon: '🐍', color: 'linear-gradient(135deg, #3776AB, #1E415E)', description: 'Master Python programming, data structures, OOP, and practical application building.' },
  { id: 'machine-learning', name: 'Machine Learning', icon: '🤖', color: 'linear-gradient(135deg, #FF6F61, #C0392B)', description: 'Explore machine learning models, regression, classification, and neural network fundamentals.' },
  { id: 'java', name: 'Java', icon: '☕', color: 'linear-gradient(135deg, #E76F51, #B53718)', description: 'Build enterprise application foundation with Java OOP, collections, and multi-threading.' },
  { id: 'web-development', name: 'Web Development', icon: '🌐', color: 'linear-gradient(135deg, #2A9D8F, #1D6F64)', description: 'Create modern responsive websites & web applications using HTML, CSS, JavaScript, and React.' },
  { id: 'data-science', name: 'Data Science', icon: '📊', color: 'linear-gradient(135deg, #264653, #1A2E38)', description: 'Analyze data, build predictive models, and master statistical analysis with Python and Pandas.' },
  { id: 'artificial-intelligence', name: 'Artificial Intelligence', icon: '🧠', color: 'linear-gradient(135deg, #8E44AD, #5B2C6F)', description: 'Understand search algorithms, knowledge representation, deep learning, and AI logic.' },
  { id: 'robotics', name: 'Robotics', icon: '🦾', color: 'linear-gradient(135deg, #D4AC0D, #9A7D0A)', description: 'Discover autonomous systems, sensor integration, kinematics, and microcontroller control.' },
  { id: 'cloud-computing', name: 'Cloud Computing', icon: '☁️', color: 'linear-gradient(135deg, #00B4D8, #0077B6)', description: 'Deploy scalable applications on AWS, Docker, Kubernetes, and cloud microservices.' },
  { id: 'cybersecurity', name: 'Cybersecurity', icon: '🛡️', color: 'linear-gradient(135deg, #E63946, #9B111E)', description: 'Learn network security, ethical hacking, cryptography, threat vectors, and defense.' },
  { id: 'database', name: 'Database', icon: '🗄️', color: 'linear-gradient(135deg, #457B9D, #1D3557)', description: 'Master SQL databases, relational schema design, query optimization, and NoSQL storage.' }
];

export const QUIZ_PASSING_PERCENTAGE = 70;

// Helper to generate standard 5-unit curricula for default or admin courses
export const DEFAULT_CURRICULA = {
  Python: [
    {
      id: 1,
      title: 'Unit 1: Python Fundamentals & Environment Setup',
      overview: 'Get introduced to Python, understand why it is one of the most popular programming languages, install the Python interpreter, and write your first script.',
      sections: [
        {
          heading: 'What is Python?',
          text: 'Python is a high-level, interpreted, general-purpose programming language created by Guido van Rossum. It emphasizes readability with its clean indentation-based syntax. Python supports multiple programming paradigms including Object-Oriented, Functional, and Procedural programming.'
        },
        {
          heading: 'Key Concepts & Characteristics',
          text: '1. Interpreted Language: Code is executed line by line.\n2. Dynamically Typed: Variable types are checked during execution, not compilation.\n3. High-Level: Handles memory management and system details automatically.\n4. Extensive Standard Library: Includes built-in tools for strings, math, file I/O, and web protocols.'
        },
        {
          heading: 'Practical Example: Hello World & Variables',
          code: `# Hello World Program
print("Welcome to Python Programming on EduPortal!")

# Variable assignments
user_name = "Vijeta"
course = "Python Fundamentals"
duration_weeks = 12

print(f"Student: {user_name} | Course: {course} ({duration_weeks} weeks)")`
        },
        {
          heading: 'Important Takeaways',
          text: '• Always use proper 4-space indentation for code blocks.\n• Use meaningful variable names written in snake_case.\n• Single-line comments start with # while multi-line strings use triple quotes (""").'
        }
      ],
      quiz: [
        {
          question: 'Who created the Python programming language?',
          options: ["Dennis Ritchie","Guido van Rossum","James Gosling","Bjarne Stroustrup"],
          correctAnswer: 1,
          explanation: 'Guido van Rossum released Python in 1991 as a successor to the ABC language.'
        },
        {
          question: 'Which of the following is true about Python?',
          options: ["It requires explicit variable type declarations","It is a compiled-only language","It is dynamically typed and interpreted","It uses curly braces {} to define code blocks"],
          correctAnswer: 2,
          explanation: 'Python is interpreted line-by-line and dynamically determines variable types at runtime.'
        },
        {
          question: 'What is the correct file extension for Python files?',
          options: [".py",".pyt",".python",".pt"],
          correctAnswer: 0,
          explanation: 'Python script files use the .py extension.'
        },
        {
          question: 'Which built-in function outputs text to the standard console?',
          options: ["echo()","log()","write()","print()"],
          correctAnswer: 3,
          explanation: 'print() displays output on the screen.'
        },
        {
          question: 'How are code blocks demarcated in Python?',
          options: ["Semicolons at the end of each line","Curly brackets {}","Indentation (whitespace)","BEGIN and END keywords"],
          correctAnswer: 2,
          explanation: 'Python relies on uniform indentation to delimit blocks of statements.'
        },
        {
          question: 'Which built-in Python function returns the memory address/identity of an object?',
          options: ["addr()","id()","memory()","pointer()"],
          correctAnswer: 1,
          explanation: 'id() returns the unique memory address identifier of an object in CPython.'
        },
        {
          question: 'What is the boolean truth value of an empty string "" and integer 0 in Python?',
          options: ["Both evaluate to True","0 is False, \"\" is True","0 is True, \"\" is False","Both evaluate to False"],
          correctAnswer: 3,
          explanation: 'In Python, 0, empty sequences, and None evaluate to False.'
        },
        {
          question: 'Which operator performs integer floor division in Python?',
          options: ["//","/","%","div"],
          correctAnswer: 0,
          explanation: 'The // operator performs floor division, truncating fractional parts.'
        },
        {
          question: 'What does PEP stand for in the Python development ecosystem?',
          options: ["Program Execution Protocol","Python Enterprise Package","Python Enhancement Proposal","Python Environment Path"],
          correctAnswer: 2,
          explanation: 'PEP stands for Python Enhancement Proposal, standardizing features and styling.'
        },
        {
          question: 'Which data type is immutable in Python?',
          options: ["list","dict","set","tuple"],
          correctAnswer: 3,
          explanation: 'Tuples, strings, integers, and floats are immutable in Python.'
        }
      ]
    },
    {
      id: 2,
      title: 'Unit 2: Variables, Data Types & Operators',
      overview: 'Explore core data types including integers, floats, strings, and booleans. Master type casting, arithmetic, comparison, and logical operators.',
      sections: [
        {
          heading: 'Built-in Data Types',
          text: 'Python provides several fundamental built-in data types:\n- int: Whole numbers (e.g., 42, -7)\n- float: Decimal numbers (e.g., 3.14, 99.99)\n- str: Text enclosed in single, double, or triple quotes\n- bool: Logical truth values (True or False)'
        },
        {
          heading: 'Type Conversion & Operations',
          text: 'Use int(), float(), and str() functions to convert values between data types. Comparison operators (==, !=, >, <, >=, <=) evaluate to boolean values. Logical operators (and, or, not) allow combining complex expressions.'
        },
        {
          heading: 'Practical Example: Working with Types',
          code: `# Temperature Converter (Fahrenheit to Celsius)
fahrenheit = 98.6
celsius = (fahrenheit - 32) * 5 / 9

print(f"{fahrenheit}°F is equal to {celsius:.2f}°C")

# Boolean comparisons
is_passing = celsius > 20.0
print("Passed thermal threshold:", is_passing)`
        },
        {
          heading: 'Important Takeaways',
          text: '• Division using / always returns a float (e.g. 7 / 2 = 3.5).\n• Floor division using // truncates decimals (e.g. 7 // 2 = 3).\n• String immutability means modifying a string creates a new string instance.'
        }
      ],
      quiz: [
        {
          question: 'What is the return type of 10 / 2 in Python 3?',
          options: ["int","double","str","float"],
          correctAnswer: 3,
          explanation: 'Standard division (/) in Python always produces a float result (5.0).'
        },
        {
          question: 'Which operator is used for integer floor division?',
          options: ["//","/","%","**"],
          correctAnswer: 0,
          explanation: 'The // operator performs floor division, discarding fractional parts.'
        },
        {
          question: 'How do you check the data type of a variable x?',
          options: ["typeof(x)","x.getType()","type(x)","checkType(x)"],
          correctAnswer: 2,
          explanation: 'The built-in type(x) function returns the class type of an object.'
        },
        {
          question: 'What will bool("") evaluate to in Python?',
          options: ["True","False","None","Error"],
          correctAnswer: 1,
          explanation: 'Empty strings, empty collections, and numerical zero evaluate to False in boolean context.'
        },
        {
          question: 'Which of the following is a valid variable name in Python?',
          options: ["student_name","2nd_student","student-name","class"],
          correctAnswer: 0,
          explanation: 'Variable names cannot start with numbers, contain hyphens, or use reserved keywords like class.'
        }
      ]
    },
    {
      id: 3,
      title: 'Unit 3: Control Flow, Loops & Conditionals',
      overview: 'Control program execution flow using if-elif-else conditional branches and execute repetitive tasks efficiently using for and while loops.',
      sections: [
        {
          heading: 'Conditional Branching',
          text: 'Conditional statements allow your code to make decisions based on runtime values. The if-elif-else structure executes the block associated with the first True condition.'
        },
        {
          heading: 'Iterating with Loops',
          text: 'Use `for` loops to iterate over sequences (lists, strings, range generators). Use `while` loops to execute code repeatedly as long as a condition remains True. Use `break` to exit a loop early and `continue` to skip to the next iteration.'
        },
        {
          heading: 'Practical Example: Grade Calculator Loop',
          code: `scores = [85, 92, 68, 74, 95]

for score in scores:
    if score >= 90:
        grade = "A"
    elif score >= 80:
        grade = "B"
    elif score >= 70:
        grade = "C"
    else:
        grade = "Needs Improvement"
    print(f"Score {score} -> Grade: {grade}")`
        },
        {
          heading: 'Important Takeaways',
          text: '• Range function `range(start, stop, step)` generates numbers up to (but not including) `stop`.\n• Avoid infinite while loops by ensuring loop conditions eventually evaluate to False.\n• Else blocks attached to loops execute only if the loop completes without encountering a `break`.'
        }
      ],
      quiz: [
        {
          question: 'Which keyword is used for additional conditional branches after an initial if statement?',
          options: ["else if","elseif","then","elif"],
          correctAnswer: 3,
          explanation: 'Python uses the short keyword `elif` for secondary condition branches.'
        },
        {
          question: 'What does range(1, 5) produce when iterated over?',
          options: ['[1, 2, 3, 4, 5]', '[1, 2, 3, 4]', '[0, 1, 2, 3, 4]', '[2, 3, 4, 5]'],
          correctAnswer: 1,
          explanation: 'range(start, stop) generates numbers from start up to stop - 1.'
        },
        {
          question: 'Which statement immediately exits a loop regardless of remaining iterations?',
          options: ["exit","break","stop","continue"],
          correctAnswer: 1,
          explanation: 'The `break` statement terminates the enclosing loop prematurely.'
        },
        {
          question: 'What is the output of range(5)?',
          options: ["1, 2, 3, 4, 5","0, 1, 2, 3, 4, 5","0, 1, 2, 3, 4","1, 2, 3, 4"],
          correctAnswer: 2,
          explanation: 'When called with one argument, range defaults to starting at 0 and stopping before that value.'
        },
        {
          question: 'Which loop is best suited when the exact number of iterations is known in advance?',
          options: ["for loop","do-while loop","while loop","repeat-until loop"],
          correctAnswer: 0,
          explanation: 'The `for` loop is designed for iterating over predefined sequences or ranges.'
        }
      ]
    },
    {
      id: 4,
      title: 'Unit 4: Functions, Collections & Data Structures',
      overview: 'Organize code into modular reusable functions. Deep dive into fundamental Python data structures: Lists, Tuples, Sets, and Dictionaries.',
      sections: [
        {
          heading: 'Defining Functions',
          text: 'Functions encapsulate reusable code blocks. Defined with the `def` keyword, functions accept positional/keyword parameters and return values using the `return` statement.'
        },
        {
          heading: 'Core Data Structures',
          text: '• Lists: Ordered, mutable sequence of items `[1, 2, 3]`.\n• Tuples: Ordered, immutable sequence `(1, 2, 3)`.\n• Dictionaries: Key-value pairs `{"name": "Alice", "age": 22}`.\n• Sets: Unordered collection of unique items `{1, 2, 3}`.'
        },
        {
          heading: 'Practical Example: Function & Dictionary',
          code: `def calculate_student_stats(student_data):
    total = sum(student_data["grades"])
    avg = total / len(student_data["grades"])
    return {
        "student": student_data["name"],
        "average": round(avg, 2),
        "status": "Passed" if avg >= 70 else "Failed"
    }

student = {"name": "John Doe", "grades": [88, 92, 79, 95]}
result = calculate_student_stats(student)
print(result)`
        },
        {
          heading: 'Important Takeaways',
          text: '• Use tuples when data should remain constant throughout execution.\n• Dictionary keys must be immutable types (strings, numbers, tuples).\n• List slicing `list[start:stop:step]` provides powerful subset extraction.'
        }
      ],
      quiz: [
        {
          question: 'Which keyword is used to define a function in Python?',
          options: ["function","def","fun","define"],
          correctAnswer: 1,
          explanation: 'Functions in Python are declared using the `def` keyword.'
        },
        {
          question: 'Which Python collection is ordered, mutable, and allows duplicate elements?',
          options: ["Tuple","Set","List","Dictionary"],
          correctAnswer: 2,
          explanation: 'Lists are enclosed in square brackets `[]`, maintain insertion order, and allow modifications.'
        },
        {
          question: 'What is the main characteristic of a Python Set?',
          options: ["Keeps elements sorted automatically","Allows duplicate keys","Is immutable like a tuple","Contains unique, unordered elements"],
          correctAnswer: 3,
          explanation: 'Sets enforce uniqueness — duplicate elements are automatically stripped.'
        },
        {
          question: 'How do you access the value associated with key "email" in dict user_profile?',
          options: ['user_profile.email', 'user_profile["email"]', 'user_profile(email)', 'user_profile->email'],
          correctAnswer: 1,
          explanation: 'Dictionary values are accessed using bracket notation `dict[key]` or `.get(key)`.'
        },
        {
          question: 'What happens if you attempt to modify an element of a Tuple after creation?',
          options: ["The tuple is updated silently","A TypeError is raised","A new tuple is automatically created","The modification is ignored"],
          correctAnswer: 1,
          explanation: 'Tuples are immutable; attempting assignment on an index raises a TypeError.'
        }
      ]
    },
    {
      id: 5,
      title: 'Unit 5: Object-Oriented Programming & File Handling',
      overview: 'Learn OOP principles (Classes, Objects, Inheritance, Encapsulation) and perform practical file reading and exception handling in Python.',
      sections: [
        {
          heading: 'Object-Oriented Programming (OOP)',
          text: 'Classes act as blueprints for creating objects. Classes combine state (attributes) and behavior (methods). Use `__init__` constructor method to initialize object instance attributes.'
        },
        {
          heading: 'File I/O & Exception Handling',
          text: 'Safely read and write files using the `with open(...)` context manager. Handle potential runtime crashes gracefully using `try`, `except`, `finally` blocks.'
        },
        {
          heading: 'Practical Example: Student Class & File Writing',
          code: `class StudentCourse:
    def __init__(self, student_name, course_name):
        self.student_name = student_name
        self.course_name = course_name
        self.units_completed = 0

    def complete_unit(self):
        self.units_completed += 1
        return self.units_completed * 20

# Exception handling demonstration
try:
    student = StudentCourse("Vijeta Baskaran", "Python")
    progress = student.complete_unit()
    print(f"{student.student_name} reached {progress}% completion!")
except Exception as err:
    print("Error processing student record:", err)`
        },
        {
          heading: 'Important Takeaways',
          text: '• The `self` parameter refers to the current instance of the class.\n• Always use `with open()` when reading/writing files to automatically close file handles.\n• Inheritance allows child classes to inherit attributes and methods from a parent class.'
        }
      ],
      quiz: [
        {
          question: 'What is the purpose of the __init__ method in a Python class?',
          options: ["Initializes instance attributes when an object is created","Destroys instances","Imports external libraries","Defines private functions"],
          correctAnswer: 0,
          explanation: '`__init__` is the constructor method called when instantiating a new class object.'
        },
        {
          question: 'What keyword represents the instance of the class itself within instance methods?',
          options: ["this","me","instance","self"],
          correctAnswer: 3,
          explanation: 'By convention, `self` is passed as the first parameter to instance methods.'
        },
        {
          question: 'Which block executes code regardless of whether an exception occurred or not?',
          options: ["try","except","finally","catch"],
          correctAnswer: 2,
          explanation: 'The `finally` block runs cleanup code regardless of exception status.'
        },
        {
          question: 'Why is `with open("data.txt", "r") as f:` preferred for file handling?',
          options: ["It automatically closes the file when execution exits the block","It runs faster","It prevents all syntax errors","It encrypts file content"],
          correctAnswer: 0,
          explanation: 'The `with` context manager guarantees file closure even if exceptions occur inside the block.'
        },
        {
          question: 'What OOP pillar allows a child class to acquire properties of a parent class?',
          options: ["Encapsulation","Inheritance","Polymorphism","Abstraction"],
          correctAnswer: 1,
          explanation: 'Inheritance allows classes to reuse code and behavior from base classes.'
        }
      ]
    }
  ]
};

// Returns 5 rich learning units tailored to the domain or topic
export function getCourseUnits(course) {
  if (!course) return DEFAULT_CURRICULA.Python;

  // If course already has explicit modules or units attached, return them
  if (Array.isArray(course.modules) && course.modules.length > 0) {
    return course.modules;
  }
  if (Array.isArray(course.units) && course.units.length > 0) {
    return course.units;
  }

  const domain = course.domain || course.category || 'Web Development';
  
  // Return pre-crafted Python curriculum if Python
  if (domain.toLowerCase().includes('python')) {
    return DEFAULT_CURRICULA.Python;
  }

  // Domain-customized unit generator for Web Dev, Data Science, ML, Java, Security, Cloud, etc.
  return generateDomainUnits(domain, course.title || course.name || 'Student Course');
}

function generateDomainUnits(domain, courseTitle) {
  return [
    {
      id: 1,
      title: `Unit 1: Introduction & Environment Setup for ${domain}`,
      overview: `Establish foundational knowledge of ${domain}. Learn essential terminology, core tools, architecture, and configure your development environment.`,
      sections: [
        {
          heading: `Overview of ${domain}`,
          text: `${courseTitle} provides essential skill building in ${domain}. You will learn industry standard methodologies, core tools, and architecture principles used by software professionals worldwide.`
        },
        {
          heading: 'Core Architecture & Key Concepts',
          text: `1. Fundamentals: Core building blocks and workflow requirements.\n2. Tooling: Compilers, execution environments, and modern IDES.\n3. Best Practices: Writing clean, scalable, and maintainable project structures.`
        },
        {
          heading: 'Practical Setup & Execution',
          code: `// Practical Initialization Example for ${courseTitle}
console.log("Initializing ${domain} environment...");
const config = {
  course: "${courseTitle}",
  domain: "${domain}",
  status: "Active Unit 1"
};
console.log("Environment ready!", config);`
        },
        {
          heading: 'Key Takeaways',
          text: '• Set up your workspace before diving into implementation details.\n• Understand project layout and standard directory organization.\n• Review documentation for language/framework specs.'
        }
      ],
      quiz: [
        {
          question: `What is the primary objective of studying ${domain}?`,
          options: [`Mastering fundamental principles of ${domain}`, 'Bypassing development guidelines', 'Replacing operating systems', 'None of the above'],
          correctAnswer: 0,
          explanation: `Unit 1 focuses on building strong foundational concepts in ${domain}.`
        },
        {
          question: 'Why is configuring a proper development environment important?',
          options: ["It provides necessary tools, compilers, and dependencies","It guarantees zero runtime bugs","It is optional for modern software","It decreases execution speed"],
          correctAnswer: 0,
          explanation: 'A structured environment ensures all tools and dependencies run consistently.'
        },
        {
          question: 'Which approach ensures project maintainability?',
          options: ["Following modular architecture and naming conventions","Writing all code in a single file","Ignoring formatting rules","Avoiding comments"],
          correctAnswer: 0,
          explanation: 'Modular design makes code readable, extensible, and easier to debug.'
        },
        {
          question: 'What role do software frameworks play in modern development?',
          options: ["They slow down developers","They provide reusable components and standardized patterns","They eliminate the need for logic","They only handle styling"],
          correctAnswer: 1,
          explanation: 'Frameworks streamline development with tested abstractions and standard workflows.'
        },
        {
          question: 'What is the first step in starting a new technical module?',
          options: ["Deploying to production","Deleting existing files","Skipping setup","Understanding core specifications and requirements"],
          correctAnswer: 3,
          explanation: 'Understanding specifications ensures proper system design before execution.'
        },
        {
          question: 'What is the role of source control (e.g. Git) when working in ${domain} projects?',
          options: ["Compressing video files","Replacing compilers","Tracking revision history, collaborating safely, and managing branches","Running unit tests automatically without code"],
          correctAnswer: 2,
          explanation: 'Version control tracks code evolutions and coordinates team contributions.'
        },
        {
          question: 'Which command line tool compiles or executes code in modern development workflows?',
          options: ["Calculator","Domain CLI runner (e.g. node, python, javac)","Graphic viewer","Text editor only"],
          correctAnswer: 1,
          explanation: 'Runtime CLIs execute scripts and compile project source trees.'
        },
        {
          question: 'What document establishes coding style rules and naming standards in ${domain}?',
          options: ["Style Guide (e.g. PEP 8, Airbnb Style Guide)","Hardware warranty","User manual","License agreement"],
          correctAnswer: 0,
          explanation: 'Style guides standardize formatting to enhance team readability.'
        },
        {
          question: 'Why should environment variables be used for configuration secrets in ${domain}?',
          options: ["To make files larger","To slow down git commits","To avoid hardcoding sensitive API keys or credentials directly in source code","They are required by HTML"],
          correctAnswer: 2,
          explanation: 'Environment variables isolate credentials from public repositories.'
        },
        {
          question: 'What is the purpose of package managers in ${domain} ecosystems?',
          options: ["Managing physical shipping packages","Writing documentation","Compiling OS kernels","Automating installation, updating, and dependency resolution of third-party libraries"],
          correctAnswer: 3,
          explanation: 'Package managers (npm, pip, maven) resolve library dependency trees.'
        }
      ]
    },
    {
      id: 2,
      title: `Unit 2: Core Data Structures & Logic in ${domain}`,
      overview: `Understand core data manipulation techniques, logic branching, state control, and structural workflows pertinent to ${domain}.`,
      sections: [
        {
          heading: 'Data Representation & Control Flow',
          text: `Efficient data structures are essential in ${domain}. You will explore how memory, data schemas, and logical operations operate together seamlessly.`
        },
        {
          heading: 'Implementation Strategies',
          text: '• Data Abstraction: Organizing information into logical entities.\n• Efficiency: Choosing optimal structures for lookup and mutation.\n• Algorithmic Logic: Combining conditions to build responsive logic.'
        },
        {
          heading: 'Practical Example: Logic Execution',
          code: `// ${domain} Data Processing Example
function processDataset(dataItems) {
  return dataItems
    .filter(item => item.active)
    .map(item => ({ id: item.id, score: item.value * 1.5 }));
}

const sampleData = [{ id: 1, active: true, value: 10 }, { id: 2, active: false, value: 5 }];
console.log(processDataset(sampleData));`
        },
        {
          heading: 'Key Takeaways',
          text: '• Choose data structures based on access patterns.\n• Clean control flow prevents unhandled edge cases.\n• Test logic with diverse input datasets.'
        }
      ],
      quiz: [
        {
          question: 'Why is selecting the appropriate data structure critical?',
          options: ["Data structures do not affect code execution","It impacts performance, memory utilization, and code clarity","It only changes file size","It is enforced by hardware"],
          correctAnswer: 1,
          explanation: 'Data structures directly dictate time and space complexity in applications.'
        },
        {
          question: 'What does data filtering accomplish in a processing pipeline?',
          options: ["Sorts data alphabetically","Deletes all records","Extracts only elements meeting specific criteria","Duplicates elements"],
          correctAnswer: 2,
          explanation: 'Filtering isolates data elements that satisfy specified boolean logic.'
        },
        {
          question: 'What is the benefit of immutable data representations?',
          options: ["They consume less memory always","They prevent unintended side effects and state mutations","They make code untestable","They disable functions"],
          correctAnswer: 1,
          explanation: 'Immutability ensures data state remains consistent across execution flows.'
        },
        {
          question: 'Which evaluation occurs when chaining logic statements?',
          options: ["Short-circuit boolean logic evaluation","Random sequence execution","Ignoring errors","Infinite looping"],
          correctAnswer: 0,
          explanation: 'Modern runtime engines evaluate boolean chains with short-circuit optimization.'
        },
        {
          question: 'What is state management responsible for?',
          options: ["Installing OS packages","Printing error logs only","Tracking data modifications throughout application lifecycle","Closing ports"],
          correctAnswer: 2,
          explanation: 'State management tracks dynamic changes to application data.'
        },
        {
          question: 'What is the time complexity of looking up a key in an efficient hash map in ${domain}?',
          options: ["O(N^2)","O(N!)","O(log N) worst case guaranteed","O(1) average time"],
          correctAnswer: 3,
          explanation: 'Hash maps achieve constant O(1) average lookup through hash indexing.'
        },
        {
          question: 'What data structure operates on a Last-In, First-Out (LIFO) basis in ${domain}?',
          options: ["Stack","Queue","Array","Tree"],
          correctAnswer: 0,
          explanation: 'Stacks operate strictly on LIFO order (push/pop at top).'
        },
        {
          question: 'What data structure operates on a First-In, First-Out (FIFO) basis?',
          options: ["Stack","Heap","Queue","Graph"],
          correctAnswer: 2,
          explanation: 'Queues process elements in FIFO sequence (enqueue back, dequeue front).'
        },
        {
          question: 'What algorithm strategy breaks a problem down into smaller overlapping subproblems using memoization?',
          options: ["Brute Force","Dynamic Programming","Random Search","Linear Scan"],
          correctAnswer: 1,
          explanation: 'Dynamic programming optimizes recursive problems by caching subproblem solutions.'
        },
        {
          question: 'Why is binary search more efficient than linear search on sorted data?',
          options: ["It scans every item twice","It uses random guessing","It requires zero memory","It divides the search space in half at each step, running in O(log N) time"],
          correctAnswer: 3,
          explanation: 'Binary search halves candidates iteratively, achieving logarithmic complexity.'
        }
      ]
    },
    {
      id: 3,
      title: `Unit 3: Object Modeling, APIs & Design Patterns in ${domain}`,
      overview: `Deepen your domain expertise by creating modular components, defining robust interfaces, and utilizing battle-tested software design patterns.`,
      sections: [
        {
          heading: 'Design Patterns & Component Design',
          text: `As projects grow in ${domain}, structured architecture prevents technical debt. Design patterns provide reusable templates to solve recurring architectural challenges.`
        },
        {
          heading: 'Key Principles',
          text: '1. Separation of Concerns: Decoupling business logic from user presentation.\n2. Reusability: Creating self-contained components.\n3. Interface Stability: Designing clean signatures.'
        },
        {
          heading: 'Practical Example: Component Architecture',
          code: `// Modular Service Architecture
class ${domain.replace(/\s+/g, '')}Service {
  constructor(apiEndpoint) {
    this.apiEndpoint = apiEndpoint;
  }

  async fetchData() {
    return { success: true, payload: ["Item A", "Item B"] };
  }
}

const service = new ${domain.replace(/\s+/g, '')}Service("/api/v1/resource");
service.fetchData().then(res => console.log(res));`
        },
        {
          heading: 'Key Takeaways',
          text: '• Keep modules small with focused responsibilities.\n• Decouple implementation from interface contracts.\n• Re-use established design patterns.'
        }
      ],
      quiz: [
        {
          question: 'What is the primary benefit of the Separation of Concerns principle?',
          options: ["Increases code duplication","Compiles code faster","Improves code maintainability and testability","Removes user interfaces"],
          correctAnswer: 2,
          explanation: 'Separating concerns minimizes side effects and makes subsystems independently testable.'
        },
        {
          question: 'What is an API contract?',
          options: ["A formal agreement specifying endpoints, inputs, and output formats","A hardware specification","A legal copyright document","A CSS theme file"],
          correctAnswer: 0,
          explanation: 'API contracts define how software components communicate with guaranteed inputs/outputs.'
        },
        {
          question: 'Which design pattern is best for ensuring a single instance of a class?',
          options: ["Factory Pattern","Singleton Pattern","Observer Pattern","Strategy Pattern"],
          correctAnswer: 1,
          explanation: 'The Singleton pattern restricts instantiation of a class to a single object.'
        },
        {
          question: 'What is the advantage of modular design?',
          options: ["Everything is bound together in one place","Eliminates error checking","Components can be developed, tested, and updated independently","Allows direct memory access"],
          correctAnswer: 2,
          explanation: 'Modular design supports independent lifecycle management for individual system modules.'
        },
        {
          question: 'Why are async operations used for network calls?',
          options: ["They prevent the main UI thread from blocking","They force CPU overclocking","They disable network encryption","They bypass server responses"],
          correctAnswer: 0,
          explanation: 'Asynchronous calls allow the user interface to stay responsive while awaiting network results.'
        },
        {
          question: 'What is the Open/Closed Principle (the O in SOLID design)?',
          options: ["Doors should stay open","All code must be open source","Classes must have no methods","Software entities should be open for extension, but closed for modification"],
          correctAnswer: 3,
          explanation: 'The Open/Closed principle advises extending behavior through inheritance/polymorphism without editing verified code.'
        },
        {
          question: 'Which design pattern defines a one-to-many dependency where state changes automatically notify observers?',
          options: ["Singleton Pattern","Factory Pattern","Observer Pattern","Adapter Pattern"],
          correctAnswer: 2,
          explanation: 'The Observer pattern notifies subscribers whenever subject state updates.'
        },
        {
          question: 'What design pattern provides a unified interface to a set of interfaces in a subsystem (simplifying caller interaction)?',
          options: ["Decorator Pattern","Facade Pattern","Proxy Pattern","Bridge Pattern"],
          correctAnswer: 1,
          explanation: 'Facade masks complex internal subsystems behind a clean, simple high-level interface.'
        },
        {
          question: 'What is Dependency Inversion in modern application architecture?',
          options: ["Inverting screen orientation","Running code backwards","Deleting dependencies","High-level modules should depend on abstractions (interfaces), not on concrete low-level details"],
          correctAnswer: 3,
          explanation: 'Dependency inversion decouples components through abstract interfaces.'
        },
        {
          question: 'What is the role of an API Gateway in distributed architectures?',
          options: ["Acting as a single entry point that routes, authenticates, and rate-limits requests to downstream services","Rendering 3D graphics","Managing local printers","Writing unit tests"],
          correctAnswer: 0,
          explanation: 'API Gateways consolidate routing, authentication, and cross-cutting concerns.'
        }
      ]
    },
    {
      id: 4,
      title: `Unit 4: Advanced Optimizations & Security in ${domain}`,
      overview: `Learn performance optimization techniques, error handling strategies, security defenses, and validation mechanisms essential for ${domain}.`,
      sections: [
        {
          heading: 'Security & Optimization Principles',
          text: `Production applications require high speed and rigorous security defenses. In ${domain}, security considerations must be integrated into every step of development.`
        },
        {
          heading: 'Defense & Efficiency Strategies',
          text: '• Input Validation: Sanitizing data inputs to prevent injection attacks.\n• Caching: Storing frequently accessed records in memory.\n• Error Handling: Gracefully handling failures without disclosing sensitive system details.'
        },
        {
          heading: 'Practical Example: Safe Data Handling',
          code: `// Defensive Validation & Exception Guard
function executeOperation(inputPayload) {
  try {
    if (!inputPayload || typeof inputPayload !== "object") {
      throw new Error("Invalid payload provided");
    }
    console.log("Processing secure operation:", inputPayload);
    return { status: 200, message: "Success" };
  } catch (err) {
    console.error("Operation failed safely:", err.message);
    return { status: 400, error: err.message };
  }
}`
        },
        {
          heading: 'Key Takeaways',
          text: '• Never trust raw user inputs without validation.\n• Use try-catch blocks around volatile I/O and external calls.\n• Monitor memory usage and optimize resource bottlenecks.'
        }
      ],
      quiz: [
        {
          question: 'What is the goal of input sanitization and validation?',
          options: ["To format text to uppercase","To delete user accounts","To prevent malicious injection and invalid data corruption","To speed up rendering"],
          correctAnswer: 2,
          explanation: 'Validation ensures incoming payloads conform to safe, expected formats before execution.'
        },
        {
          question: 'How does caching improve application performance?',
          options: ["By deleting database records","By adding deliberate delays","By disabling network protocols","By storing computed results in memory to avoid repetitive operations"],
          correctAnswer: 3,
          explanation: 'Caching reduces latency by serving pre-computed or frequently requested data directly.'
        },
        {
          question: 'What is defensive programming?',
          options: ["Writing code without testing","Preventing other developers from reading code","Using antivirus software","Designing code to anticipate potential errors and invalid states"],
          correctAnswer: 3,
          explanation: 'Defensive programming anticipates unexpected edge cases to prevent system failures.'
        },
        {
          question: 'Why should error messages shown to users NOT reveal stack traces?',
          options: ["Stack traces may expose sensitive system details to attackers","Stack traces look messy","Browsers block stack traces","Stack traces alter colors"],
          correctAnswer: 0,
          explanation: 'Exposing detailed internal errors provides attackers with blueprint info about system vulnerabilities.'
        },
        {
          question: 'Which practice improves API request security?',
          options: ["Sending passwords in plain text","Removing CORS checks","Enforcing HTTPS encryption and authentication tokens","Allowing unauthenticated root access"],
          correctAnswer: 2,
          explanation: 'HTTPS and token authentication guard data integrity and verify caller identity.'
        },
        {
          question: 'What security practice limits system damage by giving users/services only the bare minimum permissions necessary?',
          options: ["Defense in Depth","Principle of Least Privilege","Single Sign-On","Open Access Model"],
          correctAnswer: 1,
          explanation: 'Least privilege minimizes blast radius by restricting access permissions.'
        },
        {
          question: 'What technique mitigates Denial of Service (DoS) by capping the number of requests a client can make in a given timeframe?',
          options: ["Rate Limiting / Throttling","Data Compression","SQL Injection","Database Indexing"],
          correctAnswer: 0,
          explanation: 'Rate limiting prevents service abuse and traffic flooding from abusive clients.'
        },
        {
          question: 'Why should passwords never be stored in plain text or with reversible encryption in databases?',
          options: ["Plain text takes up too much disk space","Databases reject plain text strings","Passwords must be visible to everyone","Database breaches would immediately expose user credentials; passwords must be hashed using salted slow algorithms (bcrypt, argon2)"],
          correctAnswer: 3,
          explanation: 'Salted slow key derivation hashes protect passwords even if database tables are compromised.'
        },
        {
          question: 'What cryptographic hash algorithm family is standardly recommended for digital signatures and data integrity (e.g. SHA-256)?',
          options: ["MD5 (deprecated)","SHA-2 / SHA-3","Rot13","CRC32"],
          correctAnswer: 1,
          explanation: 'SHA-256 provides 256-bit collision resistance for modern integrity verification.'
        },
        {
          question: 'What does Cross-Origin Resource Sharing (CORS) enforce in browser web security?',
          options: ["Encrypts hard drives","Blocks spam emails","Prevents unauthorized web pages from making background API requests to a different domain without explicit server permission headers","Formats JSON responses"],
          correctAnswer: 2,
          explanation: 'CORS uses HTTP response headers to control cross-origin resource access in browsers.'
        }
      ]
    },
    {
      id: 5,
      title: `Unit 5: Real-World Capstone & Practical ${domain} Application`,
      overview: `Integrate everything learned in Units 1-4 into a complete real-world application project. Perform end-to-end testing, deployment prep, and course review.`,
      sections: [
        {
          heading: 'Bringing It All Together',
          text: `In this final unit for ${courseTitle}, you synthesize domain setup, data modeling, architecture design, and security best practices into a production-ready application flow.`
        },
        {
          heading: 'Capstone Workflow Steps',
          text: '1. Requirement Gathering & Architecture Setup.\n2. Implementation of Core Business Logic & State.\n3. Verification via Unit & Integration Tests.\n4. Final Quality Assurance & Completion Certification.'
        },
        {
          heading: 'Practical Example: Capstone Summary Engine',
          code: `// Final Project Completion Engine
class ${domain.replace(/\s+/g, '')}Capstone {
  constructor(studentName) {
    this.studentName = studentName;
    this.unitsCompleted = 5;
    this.completionStatus = "COMPLETE";
  }

  generateCertificateSummary() {
    return {
      student: this.studentName,
      course: "${courseTitle}",
      domain: "${domain}",
      completion: "100%",
      date: new Date().toLocaleDateString()
    };
  }
}

const capstone = new ${domain.replace(/\s+/g, '')}Capstone("EduPortal Student");
console.log(capstone.generateCertificateSummary());`
        },
        {
          heading: 'Key Takeaways',
          text: '• Congratulations on reaching the final unit of this course!\n• Review all key concepts and pass the Unit 5 Quiz to achieve 100% course completion.\n• Unlock your official downloadable EduPortal Certificate of Completion.'
        }
      ],
      quiz: [
        {
          question: 'What does completing the final Capstone Unit signify?',
          options: ["Successful mastery of all 5 course units and readiness for certificate issuance","System reset","Course cancellation","Starting unit 1 again"],
          correctAnswer: 0,
          explanation: 'Passing Unit 5 completes the 100% course requirement and unlocks your certificate.'
        },
        {
          question: 'What is the purpose of integration testing in a completed project?',
          options: ["Testing CSS colors only","Verifying that individual modules function properly together","Formatting code automatically","Writing documentation"],
          correctAnswer: 1,
          explanation: 'Integration tests verify that separate system modules interact without unexpected bugs.'
        },
        {
          question: 'What is continuous integration/continuous deployment (CI/CD)?',
          options: ["Manual code copying","Deleting code weekly","Automating software building, testing, and deployment workflows","Designing logos"],
          correctAnswer: 2,
          explanation: 'CI/CD pipelines automate build and deployment verification upon code updates.'
        },
        {
          question: 'Why is post-deployment monitoring critical?',
          options: ["To change domain names daily","To prevent users from logging in","It is not necessary","To detect runtime anomalies, performance degradation, and log errors"],
          correctAnswer: 3,
          explanation: 'Monitoring provides real-time visibility into production health and error metrics.'
        },
        {
          question: 'What threshold score is required on this unit quiz to mark Unit 5 complete?',
          options: [`At least ${QUIZ_PASSING_PERCENTAGE}% passing score`, '100% only', '0%', '50%'],
          correctAnswer: 0,
          explanation: `A score of ${QUIZ_PASSING_PERCENTAGE}% or higher registers successful completion of the unit.`
        },
        {
          question: 'What is the role of Regression Testing before issuing production certificates or releases?',
          options: ["Ensuring that new code additions or fixes have not broken existing, previously working features","Reverting all changes to version 1.0","Deleting test cases","Measuring CPU clock speed"],
          correctAnswer: 0,
          explanation: 'Regression testing verifies system stability across updates.'
        },
        {
          question: 'What metric measures the percentage of code lines executed during automated testing suites?',
          options: ["Code Complexity","Line Density","Cyclomatic Index","Code Coverage"],
          correctAnswer: 3,
          explanation: 'Code coverage quantifies what proportion of codebase branches are validated by test suites.'
        },
        {
          question: 'What does Blue-Green Deployment achieve during software releases?',
          options: ["Colorful website themes","Deploying on sunny days only","Near-zero downtime releases by switching production router traffic between two identical environments","Deleting old databases"],
          correctAnswer: 2,
          explanation: 'Blue-Green routing allows instantaneous switchover and instant rollback if bugs occur.'
        },
        {
          question: 'What is the purpose of Semantic Versioning (SemVer: MAJOR.MINOR.PATCH)?',
          options: ["Standardizing version increments: Major for breaking changes, Minor for new features, Patch for bug fixes","Random version numbering","Numbering database tables","Licensing code"],
          correctAnswer: 0,
          explanation: 'SemVer conveys API stability and backward compatibility guarantees.'
        },
        {
          question: 'Upon passing all 5 units in an EduPortal course with >= 70% assessment scores, what can students view and download?',
          options: ["Source code for the Linux kernel","Official verifiable Certificate of Completion with trophy badge","Free server hardware","Course cancellation notice"],
          correctAnswer: 1,
          explanation: 'Completing all 5 units unlocks the official downloadable certificate of achievement.'
        }
      ]
    }
  ];
}

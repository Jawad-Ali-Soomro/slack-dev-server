import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Challenge } from '../models';
import User from '../models/user.model';

dotenv.config({ path: path.join(__dirname, '../config/.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/core-stack';

const sampleChallenges = [

  {
    title: 'Sum of Two Numbers',
    description: 'Write a function that takes two numbers as parameters and returns their sum.',
    difficulty: 'beginner',
    category: 'JavaScript',
    instructions: `Create a function called \`sum\` that takes two parameters \`a\` and \`b\` and returns their sum.
Your 
Example:
- sum(5, 3) should return 8
- sum(-1, 1) should return 0
- sum(0, 0) should return 0`,
    starterCode: `function sum(a, b) {

}`,
    solution: `function sum(a, b) {
  return a + b;
}`,
    answer: '8', // Expected output when sum(5, 3) is called
    testCases: [
      { input: '5, 3', expectedOutput: '8', description: 'Basic addition' },
      { input: '-1, 1', expectedOutput: '0', description: 'Negative numbers' },
      { input: '0, 0', expectedOutput: '0', description: 'Zero values' },
      { input: '10, -5', expectedOutput: '5', description: 'Positive and negative' }
    ],
    points: 10,
    tags: ['javascript', 'functions', 'math']
  },
  {
    title: 'Find Maximum Number',
    description: 'Write a function that finds the maximum number in an array.',
    difficulty: 'beginner',
    category: 'JavaScript',
    instructions: `Create a function called \`findMax\` that takes an array of numbers and returns the maximum value.

Example:
- findMax([1, 5, 3, 9, 2]) should return 9
- findMax([-1, -5, -3]) should return -1
- findMax([42]) should return 42`,
    starterCode: `function findMax(arr) {

}`,
    solution: `function findMax(arr) {
  return Math.max(...arr);
}`,
    answer: '9', // Expected output when findMax([1, 5, 3, 9, 2]) is called
    testCases: [
      { input: '[1, 5, 3, 9, 2]', expectedOutput: '9', description: 'Array with multiple numbers' },
      { input: '[-1, -5, -3]', expectedOutput: '-1', description: 'Array with negative numbers' },
      { input: '[42]', expectedOutput: '42', description: 'Single element array' }
    ],
    points: 15,
    tags: ['javascript', 'arrays', 'math']
  },
  {
    title: 'Reverse a String',
    description: 'Write a function that reverses a given string.',
    difficulty: 'beginner',
    category: 'JavaScript',
    instructions: `Create a function called \`reverseString\` that takes a string and returns it reversed.

Example:
- reverseString("hello") should return "olleh"
- reverseString("world") should return "dlrow"
- reverseString("") should return ""`,
    starterCode: `function reverseString(str) {

}`,
    solution: `function reverseString(str) {
  return str.split('').reverse().join('');
}`,
    answer: 'olleh', // Expected output when reverseString("hello") is called
    testCases: [
      { input: '"hello"', expectedOutput: '"olleh"', description: 'Basic string reversal' },
      { input: '"world"', expectedOutput: '"dlrow"', description: 'Another string' },
      { input: '""', expectedOutput: '""', description: 'Empty string' },
      { input: '"a"', expectedOutput: '"a"', description: 'Single character' }
    ],
    points: 10,
    tags: ['javascript', 'strings']
  },
  {
    title: 'Check if Number is Even',
    description: 'Write a function that checks if a number is even.',
    difficulty: 'beginner',
    category: 'JavaScript',
    instructions: `Create a function called \`isEven\` that takes a number and returns true if it's even, false otherwise.

Example:
- isEven(4) should return true
- isEven(7) should return false
- isEven(0) should return true`,
    starterCode: `function isEven(num) {

}`,
    solution: `function isEven(num) {
  return num % 2 === 0;
}`,
    answer: 'true', // Expected output when isEven(4) is called
    testCases: [
      { input: '4', expectedOutput: 'true', description: 'Even number' },
      { input: '7', expectedOutput: 'false', description: 'Odd number' },
      { input: '0', expectedOutput: 'true', description: 'Zero is even' },
      { input: '-2', expectedOutput: 'true', description: 'Negative even number' }
    ],
    points: 10,
    tags: ['javascript', 'math', 'conditions']
  },
  {
    title: 'Count Vowels in String',
    description: 'Write a function that counts the number of vowels in a string.',
    difficulty: 'beginner',
    category: 'JavaScript',
    instructions: `Create a function called \`countVowels\` that takes a string and returns the count of vowels (a, e, i, o, u) in it. Case-insensitive.

Example:
- countVowels("hello") should return 2
- countVowels("world") should return 1
- countVowels("AEIOU") should return 5`,
    starterCode: `function countVowels(str) {

}`,
    solution: `function countVowels(str) {
  const vowels = 'aeiou';
  return str.toLowerCase().split('').filter(char => vowels.includes(char)).length;
}`,
    answer: '2', // Expected output when countVowels("hello") is called
    testCases: [
      { input: '"hello"', expectedOutput: '2', description: 'String with vowels' },
      { input: '"world"', expectedOutput: '1', description: 'String with one vowel' },
      { input: '"AEIOU"', expectedOutput: '5', description: 'All uppercase vowels' },
      { input: '"xyz"', expectedOutput: '0', description: 'No vowels' }
    ],
    points: 15,
    tags: ['javascript', 'strings', 'arrays']
  },

  {
    title: 'Two Sum Problem',
    description: 'Find two numbers in an array that add up to a target value.',
    difficulty: 'intermediate',
    category: 'Algorithms',
    instructions: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Example:
- twoSum([2, 7, 11, 15], 9) should return [0, 1]
- twoSum([3, 2, 4], 6) should return [1, 2]
- twoSum([3, 3], 6) should return [0, 1]`,
    starterCode: `function twoSum(nums, target) {

}`,
    solution: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
    answer: '0,1', // Expected output when twoSum([2, 7, 11, 15], 9) is called (normalized)
    testCases: [
      { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]', description: 'Basic two sum' },
      { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]', description: 'Different indices' },
      { input: '[3, 3], 6', expectedOutput: '[0, 1]', description: 'Same numbers' }
    ],
    points: 25,
    tags: ['algorithms', 'arrays', 'hash-map']
  },
  {
    title: 'Valid Parentheses',
    description: 'Check if a string of parentheses is valid.',
    difficulty: 'intermediate',
    category: 'Data Structures',
    instructions: `Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.

Example:
- isValid("()") should return true
- isValid("()[]{}") should return true
- isValid("(]") should return false
- isValid("([)]") should return false`,
    starterCode: `function isValid(s) {

}`,
    solution: `function isValid(s) {
  const stack = [];
  const pairs = { '(': ')', '{': '}', '[': ']' };
  
  for (let char of s) {
    if (pairs[char]) {
      stack.push(char);
    } else {
      if (stack.length === 0 || pairs[stack.pop()] !== char) {
        return false;
      }
    }
  }
  
  return stack.length === 0;
}`,
    answer: 'true', // Expected output when isValid("()") is called
    testCases: [
      { input: '"()"', expectedOutput: 'true', description: 'Simple valid parentheses' },
      { input: '"()[]{}"', expectedOutput: 'true', description: 'Multiple types' },
      { input: '"(]"', expectedOutput: 'false', description: 'Invalid order' },
      { input: '"([)]"', expectedOutput: 'false', description: 'Wrong nesting' },
      { input: '"{[]}"', expectedOutput: 'true', description: 'Nested valid' }
    ],
    points: 30,
    tags: ['data-structures', 'stack', 'strings']
  },
  {
    title: 'Palindrome Checker',
    description: 'Check if a string is a palindrome (ignoring case and non-alphanumeric).',
    difficulty: 'intermediate',
    category: 'Algorithms',
    instructions: `Create a function that checks if a string is a palindrome. A palindrome reads the same forwards and backwards. Ignore case and non-alphanumeric characters.

Example:
- isPalindrome("A man a plan a canal Panama") should return true
- isPalindrome("race a car") should return false
- isPalindrome("racecar") should return true`,
    starterCode: `function isPalindrome(s) {

}`,
    solution: `function isPalindrome(s) {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
}`,
    answer: 'true', // Expected output when isPalindrome("A man a plan a canal Panama") is called
    testCases: [
      { input: '"A man a plan a canal Panama"', expectedOutput: 'true', description: 'Phrase with spaces' },
      { input: '"race a car"', expectedOutput: 'false', description: 'Not a palindrome' },
      { input: '"racecar"', expectedOutput: 'true', description: 'Simple palindrome' },
      { input: '"Madam"', expectedOutput: 'true', description: 'Case insensitive' }
    ],
    points: 20,
    tags: ['algorithms', 'strings', 'regex']
  },
  {
    title: 'Array Flatten',
    description: 'Flatten a nested array to a single level.',
    difficulty: 'intermediate',
    category: 'JavaScript',
    instructions: `Write a function that flattens a nested array to a single level.

Example:
- flatten([1, [2, 3], [4, [5, 6]]]) should return [1, 2, 3, 4, 5, 6]
- flatten([1, 2, 3]) should return [1, 2, 3]
- flatten([]) should return []`,
    starterCode: `function flatten(arr) {

}`,
    solution: `function flatten(arr) {
  return arr.reduce((acc, val) => {
    return acc.concat(Array.isArray(val) ? flatten(val) : val);
  }, []);
}`,
    answer: '1,2,3,4,5,6', // Expected output when flatten([1, [2, 3], [4, [5, 6]]]) is called (normalized)
    testCases: [
      { input: '[1, [2, 3], [4, [5, 6]]]', expectedOutput: '[1, 2, 3, 4, 5, 6]', description: 'Nested arrays' },
      { input: '[1, 2, 3]', expectedOutput: '[1, 2, 3]', description: 'Already flat' },
      { input: '[]', expectedOutput: '[]', description: 'Empty array' }
    ],
    points: 25,
    tags: ['javascript', 'arrays', 'recursion']
  },
  {
    title: 'Remove Duplicates from Array',
    description: 'Remove duplicate values from an array.',
    difficulty: 'intermediate',
    category: 'JavaScript',
    instructions: `Write a function that removes duplicate values from an array and returns a new array with unique values.

Example:
- removeDuplicates([1, 2, 2, 3, 4, 4, 5]) should return [1, 2, 3, 4, 5]
- removeDuplicates(['a', 'b', 'a', 'c']) should return ['a', 'b', 'c']
- removeDuplicates([1, 1, 1]) should return [1]`,
    starterCode: `function removeDuplicates(arr) {

}`,
    solution: `function removeDuplicates(arr) {
  return [...new Set(arr)];
}`,
    answer: '1,2,3,4,5', // Expected output when removeDuplicates([1, 2, 2, 3, 4, 4, 5]) is called (normalized)
    testCases: [
      { input: '[1, 2, 2, 3, 4, 4, 5]', expectedOutput: '[1, 2, 3, 4, 5]', description: 'Numbers with duplicates' },
      { input: '["a", "b", "a", "c"]', expectedOutput: '["a", "b", "c"]', description: 'Strings with duplicates' },
      { input: '[1, 1, 1]', expectedOutput: '[1]', description: 'All duplicates' }
    ],
    points: 15,
    tags: ['javascript', 'arrays', 'sets']
  },

  {
    title: 'Binary Search',
    description: 'Implement binary search algorithm to find an element in a sorted array.',
    difficulty: 'advanced',
    category: 'Algorithms',
    instructions: `Implement a binary search function that finds the index of a target value in a sorted array. If the target is not found, return -1.

The array is guaranteed to be sorted in ascending order.

Example:
- binarySearch([1, 2, 3, 4, 5], 3) should return 2
- binarySearch([1, 2, 3, 4, 5], 6) should return -1
- binarySearch([1, 3, 5, 7, 9], 5) should return 2`,
    starterCode: `function binarySearch(arr, target) {

}`,
    solution: `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return -1;
}`,
    answer: '2', // Expected output when binarySearch([1, 2, 3, 4, 5], 3) is called
    testCases: [
      { input: '[1, 2, 3, 4, 5], 3', expectedOutput: '2', description: 'Target found in middle' },
      { input: '[1, 2, 3, 4, 5], 6', expectedOutput: '-1', description: 'Target not found' },
      { input: '[1, 3, 5, 7, 9], 5', expectedOutput: '2', description: 'Odd length array' },
      { input: '[1, 2, 3, 4], 1', expectedOutput: '0', description: 'Target at start' }
    ],
    points: 40,
    tags: ['algorithms', 'binary-search', 'arrays']
  },
  {
    title: 'Merge Two Sorted Arrays',
    description: 'Merge two sorted arrays into one sorted array.',
    difficulty: 'advanced',
    category: 'Algorithms',
    instructions: `Given two sorted arrays, merge them into a single sorted array.

Example:
- mergeSorted([1, 3, 5], [2, 4, 6]) should return [1, 2, 3, 4, 5, 6]
- mergeSorted([1, 2], [3, 4]) should return [1, 2, 3, 4]
- mergeSorted([], [1, 2]) should return [1, 2]`,
    starterCode: `function mergeSorted(arr1, arr2) {

}`,
    solution: `function mergeSorted(arr1, arr2) {
  const merged = [];
  let i = 0, j = 0;
  
  while (i < arr1.length && j < arr2.length) {
    if (arr1[i] <= arr2[j]) {
      merged.push(arr1[i]);
      i++;
    } else {
      merged.push(arr2[j]);
      j++;
    }
  }
  
  while (i < arr1.length) {
    merged.push(arr1[i]);
    i++;
  }
  
  while (j < arr2.length) {
    merged.push(arr2[j]);
    j++;
  }
  
  return merged;
}`,
    answer: '1,2,3,4,5,6', // Expected output when mergeSorted([1, 3, 5], [2, 4, 6]) is called (normalized)
    testCases: [
      { input: '[1, 3, 5], [2, 4, 6]', expectedOutput: '[1, 2, 3, 4, 5, 6]', description: 'Two equal arrays' },
      { input: '[1, 2], [3, 4]', expectedOutput: '[1, 2, 3, 4]', description: 'Sequential arrays' },
      { input: '[], [1, 2]', expectedOutput: '[1, 2]', description: 'One empty array' },
      { input: '[5, 6, 7], [1, 2]', expectedOutput: '[1, 2, 5, 6, 7]', description: 'Different sizes' }
    ],
    points: 35,
    tags: ['algorithms', 'arrays', 'sorting']
  },
  {
    title: 'Longest Common Prefix',
    description: 'Find the longest common prefix string amongst an array of strings.',
    difficulty: 'advanced',
    category: 'Algorithms',
    instructions: `Write a function to find the longest common prefix string amongst an array of strings. If there is no common prefix, return an empty string "".

Example:
- longestCommonPrefix(["flower", "flow", "flight"]) should return "fl"
- longestCommonPrefix(["dog", "racecar", "car"]) should return ""
- longestCommonPrefix(["interspecies", "interstellar", "interstate"]) should return "inters"`,
    starterCode: `function longestCommonPrefix(strs) {

}`,
    solution: `function longestCommonPrefix(strs) {
  if (strs.length === 0) return '';
  
  let prefix = strs[0];
  
  for (let i = 1; i < strs.length; i++) {
    while (strs[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (prefix === '') return '';
    }
  }
  
  return prefix;
}`,
    answer: 'fl', // Expected output when longestCommonPrefix(["flower", "flow", "flight"]) is called
    testCases: [
      { input: '["flower", "flow", "flight"]', expectedOutput: '"fl"', description: 'Common prefix exists' },
      { input: '["dog", "racecar", "car"]', expectedOutput: '""', description: 'No common prefix' },
      { input: '["interspecies", "interstellar", "interstate"]', expectedOutput: '"inters"', description: 'Long prefix' },
      { input: '["a"]', expectedOutput: '"a"', description: 'Single string' }
    ],
    points: 30,
    tags: ['algorithms', 'strings', 'arrays']
  },
  {
    title: 'Implement Queue using Stacks',
    description: 'Implement a queue data structure using two stacks.',
    difficulty: 'advanced',
    category: 'Data Structures',
    instructions: `Implement a queue using two stacks. Your queue should support the following operations:
- push(x): Push element x to the back of queue
- pop(): Removes the element from the front of queue
- peek(): Get the front element
- empty(): Return whether the queue is empty

Example:
const queue = new MyQueue();
queue.push(1);
queue.push(2);
queue.peek(); // returns 1
queue.pop(); // returns 1
queue.empty(); // returns false`,
    starterCode: `class MyQueue {
  constructor() {

  }
  
  push(x) {

  }
  
  pop() {

  }
  
  peek() {

  }
  
  empty() {

  }
}`,
    solution: `class MyQueue {
  constructor() {
    this.stack1 = [];
    this.stack2 = [];
  }
  
  push(x) {
    this.stack1.push(x);
  }
  
  pop() {
    if (this.stack2.length === 0) {
      while (this.stack1.length > 0) {
        this.stack2.push(this.stack1.pop());
      }
    }
    return this.stack2.pop();
  }
  
  peek() {
    if (this.stack2.length === 0) {
      while (this.stack1.length > 0) {
        this.stack2.push(this.stack1.pop());
      }
    }
    return this.stack2[this.stack2.length - 1];
  }
  
  empty() {
    return this.stack1.length === 0 && this.stack2.length === 0;
  }
}`,
    answer: '1', // Expected output when queue.push(1), queue.push(2), queue.peek() is called
    testCases: [
      { input: 'push(1), push(2), peek()', expectedOutput: '1', description: 'Basic queue operations' },
      { input: 'push(1), push(2), pop()', expectedOutput: '1', description: 'Pop from queue' },
      { input: 'push(1), pop(), empty()', expectedOutput: 'true', description: 'Empty queue check' }
    ],
    points: 50,
    tags: ['data-structures', 'queue', 'stack', 'class']
  },
  {
    title: 'Find Missing Number',
    description: 'Find the missing number in an array containing n distinct numbers from 0 to n.',
    difficulty: 'advanced',
    category: 'Algorithms',
    instructions: `Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing from the array.

Example:
- missingNumber([3, 0, 1]) should return 2
- missingNumber([0, 1]) should return 2
- missingNumber([9, 6, 4, 2, 3, 5, 7, 0, 1]) should return 8`,
    starterCode: `function missingNumber(nums) {

}`,
    solution: `function missingNumber(nums) {
  const n = nums.length;
  const expectedSum = (n * (n + 1)) / 2;
  const actualSum = nums.reduce((sum, num) => sum + num, 0);
  return expectedSum - actualSum;
}`,
    answer: '2', // Expected output when missingNumber([3, 0, 1]) is called
    testCases: [
      { input: '[3, 0, 1]', expectedOutput: '2', description: 'Missing number in middle' },
      { input: '[0, 1]', expectedOutput: '2', description: 'Missing at end' },
      { input: '[9, 6, 4, 2, 3, 5, 7, 0, 1]', expectedOutput: '8', description: 'Larger array' },
      { input: '[0]', expectedOutput: '1', description: 'Single element' }
    ],
    points: 35,
    tags: ['algorithms', 'arrays', 'math']
  }
];

async function seedChallenges() {
  try {

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    let adminUser = await User.findOne({ $or: [{ role: 'admin' }, { role: 'superadmin' }] });
    
    if (!adminUser) {

      adminUser = await User.findOne();
      
      if (!adminUser) {
        console.log('No users found. Please create a user first.');
        process.exit(1);
      }
    }

    console.log(`Using user: ${adminUser.username} (${adminUser._id}) for seeding challenges`);




    const createdChallenges = [];
    for (const challengeData of sampleChallenges) {

      const existing = await Challenge.findOne({ 
        title: challengeData.title,
        createdBy: adminUser._id 
      });

      if (!existing) {
        const challenge = await Challenge.create({
          ...challengeData,
          createdBy: adminUser._id
        });
        createdChallenges.push(challenge);
        console.log(`✓ Created challenge: ${challenge.title} (${challenge.difficulty})`);
      } else {
        console.log(`⊘ Skipped existing challenge: ${challengeData.title}`);
      }
    }

    console.log(`\n✅ Successfully seeded ${createdChallenges.length} challenges!`);
    console.log(`   - Beginner: ${createdChallenges.filter(c => c.difficulty === 'beginner').length}`);
    console.log(`   - Intermediate: ${createdChallenges.filter(c => c.difficulty === 'intermediate').length}`);
    console.log(`   - Advanced: ${createdChallenges.filter(c => c.difficulty === 'advanced').length}`);

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding challenges:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedChallenges();


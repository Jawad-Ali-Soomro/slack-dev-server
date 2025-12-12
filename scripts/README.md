# Challenge Seed Script

This script populates the database with sample coding challenges across different difficulty levels.

## Prerequisites

1. Make sure you have a user account in the database (the script will use an admin user or any existing user)
2. Ensure your MongoDB connection is configured in `config/.env`
3. Install dependencies: `npm install`

## Running the Seed Script

```bash
npm run seed:challenges
```

## What It Does

The script creates **14 sample challenges**:

- **5 Beginner Challenges** (10-15 points each)
  - Sum of Two Numbers
  - Find Maximum Number
  - Reverse a String
  - Check if Number is Even
  - Count Vowels in String

- **5 Intermediate Challenges** (15-30 points each)
  - Two Sum Problem
  - Valid Parentheses
  - Palindrome Checker
  - Array Flatten
  - Remove Duplicates from Array

- **4 Advanced Challenges** (30-50 points each)
  - Binary Search
  - Merge Two Sorted Arrays
  - Longest Common Prefix
  - Implement Queue using Stacks
  - Find Missing Number

## Features

- Each challenge includes:
  - Title and description
  - Difficulty level (beginner/intermediate/advanced)
  - Category
  - Detailed instructions
  - Starter code template
  - Solution
  - Test cases
  - Points value
  - Tags

- The script:
  - Skips challenges that already exist (by title)
  - Uses an existing user as the creator
  - Provides detailed console output
  - Shows summary statistics

## Notes

- The script will not delete existing challenges (commented out by default)
- If you want to clear existing challenges, uncomment the deletion line in the script
- Challenges are assigned to the first admin user found, or any user if no admin exists


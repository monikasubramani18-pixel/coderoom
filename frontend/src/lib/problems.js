// Practice problem library. Programs read from stdin and write to stdout.
// `tests` are run by the backend judge; the first test of each problem matches the example.

export const DIFFICULTIES = ['Easy', 'Medium']

export const DIFFICULTY_STYLES = {
  Easy: 'bg-success/15 text-success',
  Medium: 'bg-warning/15 text-warning',
}

export const PROBLEMS = [
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    difficulty: 'Easy',
    topic: 'Basics',
    description:
      'Print the numbers from 1 to n, one per line. For multiples of 3 print Fizz instead of the number, for multiples of 5 print Buzz, and for multiples of both print FizzBuzz.',
    input: 'A single integer n.',
    output: 'n lines following the rules above.',
    constraints: ['1 <= n <= 1000'],
    examples: [{ input: '5', output: '1\n2\nFizz\n4\nBuzz' }],
    tests: [
      { input: '5', expected: '1\n2\nFizz\n4\nBuzz' },
      { input: '1', expected: '1' },
      { input: '3', expected: '1\n2\nFizz' },
      { input: '10', expected: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz' },
      {
        input: '15',
        expected: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz',
      },
    ],
    hints: [
      'Use a loop from 1 to n.',
      'Check divisibility by 15 (both 3 and 5) before checking 3 or 5 on their own.',
      'The % operator gives the remainder of a division.',
    ],
    approach:
      'Loop i from 1 to n. If i % 15 == 0 print FizzBuzz, else if i % 3 == 0 print Fizz, else if i % 5 == 0 print Buzz, otherwise print i. Time O(n), space O(1).',
    starter: `n = int(input())

# Print one line for each number from 1 to n
`,
  },
  {
    id: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    topic: 'Dynamic Programming',
    description:
      'You are climbing a staircase with n steps. Each move you can climb 1 or 2 steps. In how many distinct ways can you reach the top?',
    input: 'A single integer n.',
    output: 'The number of distinct ways.',
    constraints: ['1 <= n <= 45'],
    examples: [{ input: '3', output: '3', note: '1+1+1, 1+2 and 2+1' }],
    tests: [
      { input: '3', expected: '3' },
      { input: '1', expected: '1' },
      { input: '2', expected: '2' },
      { input: '5', expected: '8' },
      { input: '10', expected: '89' },
      { input: '45', expected: '1836311903' },
    ],
    hints: [
      'Think about your last move: you arrived from step n-1 or from step n-2.',
      'ways(n) = ways(n-1) + ways(n-2).',
      'You only need the previous two values, not a whole table.',
    ],
    approach:
      'This is the Fibonacci recurrence. Keep two variables for ways(n-2) and ways(n-1) and roll them forward n times. Time O(n), space O(1).',
    starter: `n = int(input())

# Print the number of distinct ways to climb n steps
`,
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    topic: 'Stacks',
    description:
      'Given a string made only of the characters ( ) [ ] { }, decide whether the brackets are balanced: every opening bracket is closed by the same type of bracket, in the correct order.',
    input: 'A single line containing only ( ) [ ] { }.',
    output: 'true if the brackets are valid, otherwise false (lowercase).',
    constraints: ['1 <= length <= 10000'],
    examples: [
      { input: '()[]{}', output: 'true' },
      { input: '(]', output: 'false' },
    ],
    tests: [
      { input: '()[]{}', expected: 'true' },
      { input: '(]', expected: 'false' },
      { input: '()', expected: 'true' },
      { input: '([{}])', expected: 'true' },
      { input: '([)]', expected: 'false' },
      { input: '((', expected: 'false' },
      { input: '){', expected: 'false' },
    ],
    hints: [
      'The most recently opened bracket must be the first one to be closed.',
      'A stack gives you exactly this last-in, first-out behaviour.',
      'Push every opening bracket. For a closing bracket, the top of the stack must be its partner.',
    ],
    approach:
      'Scan left to right with a stack. Push openers; on a closer, the stack must be non-empty and its top must be the matching opener, otherwise the answer is false. The string is valid only if the stack is empty at the end. Time O(n), space O(n).',
    starter: `s = input().strip()

# Print true or false
`,
  },
  {
    id: 'palindrome-check',
    title: 'Palindrome Check',
    difficulty: 'Easy',
    topic: 'Strings',
    description:
      'Decide whether a sentence reads the same forwards and backwards, ignoring upper/lower case and every character that is not a letter or a digit.',
    input: 'A single line of text (letters, digits, spaces and punctuation).',
    output: 'true if it is a palindrome, otherwise false (lowercase).',
    constraints: ['1 <= length <= 100000'],
    examples: [{ input: 'A man, a plan, a canal: Panama', output: 'true', note: 'becomes amanaplanacanalpanama' }],
    tests: [
      { input: 'A man, a plan, a canal: Panama', expected: 'true' },
      { input: 'race a car', expected: 'false' },
      { input: 'No lemon, no melon', expected: 'true' },
      { input: 'a', expected: 'true' },
      { input: '0P', expected: 'false' },
      { input: 'Was it a car or a cat I saw?', expected: 'true' },
    ],
    hints: [
      'First keep only letters and digits, converted to the same case.',
      'Compare the cleaned text with its reverse.',
      'For O(1) extra space, use two pointers that move towards each other and skip other characters.',
    ],
    approach:
      'Two pointers: left starts at the beginning, right at the end. Skip characters that are not alphanumeric, compare the lowercase characters, and move both inwards. Any mismatch means false. Time O(n), space O(1).',
    starter: `text = input()

# Print true or false
`,
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    difficulty: 'Easy',
    topic: 'Searching',
    description:
      'You are given a sorted array of distinct integers and a target value. Print the index of the target, or -1 if it is not present. Aim for O(log n) time.',
    input: 'Line 1: n (array length)\nLine 2: n integers in ascending order\nLine 3: the target',
    output: 'The 0-based index of the target, or -1.',
    constraints: ['1 <= n <= 100000', 'All values are distinct'],
    examples: [{ input: '6\n-1 0 3 5 9 12\n9', output: '4' }],
    tests: [
      { input: '6\n-1 0 3 5 9 12\n9', expected: '4' },
      { input: '6\n-1 0 3 5 9 12\n2', expected: '-1' },
      { input: '1\n5\n5', expected: '0' },
      { input: '1\n5\n3', expected: '-1' },
      { input: '8\n1 3 5 7 9 11 13 15\n15', expected: '7' },
      { input: '8\n1 3 5 7 9 11 13 15\n1', expected: '0' },
    ],
    hints: [
      'Because the array is sorted, one comparison can discard half of the remaining range.',
      'Keep two pointers, lo and hi, and look at the middle element.',
      'If a[mid] < target move lo to mid + 1, if it is larger move hi to mid - 1.',
    ],
    approach:
      'Maintain the search range [lo, hi]. Compare the middle element with the target and discard the half that cannot contain it. Stop when you find the target or lo > hi. Time O(log n), space O(1).',
    starter: `n = int(input())
nums = list(map(int, input().split()))
target = int(input())

# Print the index of target, or -1
`,
  },
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    topic: 'Arrays & Hashing',
    description:
      'Given an array of integers and a target, find the two different positions whose values add up to the target. Exactly one valid pair exists.',
    input: 'Line 1: n (array length)\nLine 2: n space-separated integers\nLine 3: the target',
    output: 'The two indices i and j (0-based, i < j) separated by a space.',
    constraints: ['2 <= n <= 100000', 'Exactly one valid pair exists'],
    examples: [{ input: '4\n2 7 11 15\n9', output: '0 1', note: 'nums[0] + nums[1] = 2 + 7 = 9' }],
    tests: [
      { input: '4\n2 7 11 15\n9', expected: '0 1' },
      { input: '3\n3 2 4\n6', expected: '1 2' },
      { input: '2\n3 3\n6', expected: '0 1' },
      { input: '5\n-1 -2 -3 -4 -5\n-8', expected: '2 4' },
      { input: '6\n1 5 9 13 20 8\n28', expected: '4 5' },
    ],
    hints: [
      'Two nested loops work but take O(n^2) time. Can you avoid the second loop?',
      'While scanning, remember every number you have seen and its index in a hash map.',
      'For each number x, check whether target - x is already in the map.',
    ],
    approach:
      'One pass with a hash map from value to index. For each x, look up target - x; if it is there you are done, otherwise store x. Time O(n), space O(n).',
    starter: `n = int(input())
nums = list(map(int, input().split()))
target = int(input())

# Print the two indices separated by a space
`,
  },
  {
    id: 'longest-unique-substring',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    topic: 'Sliding Window',
    description: 'Find the length of the longest substring of a string that contains no repeated character.',
    input: 'A single line containing a string of lowercase letters.',
    output: 'The length of the longest substring without repeating characters.',
    constraints: ['1 <= length <= 100000'],
    examples: [{ input: 'abcabcbb', output: '3', note: 'The longest such substring is abc.' }],
    tests: [
      { input: 'abcabcbb', expected: '3' },
      { input: 'bbbbb', expected: '1' },
      { input: 'pwwkew', expected: '3' },
      { input: 'abcdef', expected: '6' },
      { input: 'dvdf', expected: '3' },
      { input: 'tmmzuxt', expected: '5' },
    ],
    hints: [
      'Checking every substring is far too slow for long inputs.',
      'Use a window [left, right] that never contains a duplicate and grow it from the right.',
      'Store the last index of each character. When you meet a repeat inside the window, move left to just after its previous position.',
    ],
    approach:
      'Sliding window with a map from character to its last index. For each right, if the character was seen at an index >= left, set left = last + 1. Update the best length with right - left + 1. Time O(n), space O(alphabet).',
    starter: `s = input().strip()

# Print the length of the longest substring without repeating characters
`,
  },
  {
    id: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    description:
      'Given an array of integers, find the contiguous non-empty subarray with the largest sum and print that sum.',
    input: 'Line 1: n (array length)\nLine 2: n space-separated integers',
    output: 'The maximum subarray sum.',
    constraints: ['1 <= n <= 100000', '-10000 <= value <= 10000'],
    examples: [{ input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6', note: 'The subarray 4 -1 2 1 has the largest sum.' }],
    tests: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expected: '6' },
      { input: '1\n1', expected: '1' },
      { input: '5\n5 4 -1 7 8', expected: '23' },
      { input: '3\n-3 -1 -2', expected: '-1' },
      { input: '4\n-2 -1 -3 -4', expected: '-1' },
    ],
    hints: [
      'Checking every subarray works but is O(n^2) or slower.',
      'At each position decide: extend the previous subarray, or start a new one here.',
      'best_ending_here = max(x, best_ending_here + x); keep a global maximum as you go.',
    ],
    approach:
      "Kadane's algorithm. Track the best sum of a subarray ending at the current index and the best seen overall. A negative running sum is never worth carrying forward. Time O(n), space O(1).",
    starter: `n = int(input())
nums = list(map(int, input().split()))

# Print the maximum subarray sum
`,
  },
  {
    id: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'Medium',
    topic: 'Sorting',
    description:
      'Given a list of intervals, merge all overlapping intervals (intervals that touch, such as 1 4 and 4 5, also merge) and print the result sorted by start.',
    input: 'Line 1: n (number of intervals)\nNext n lines: two integers, start and end.',
    output: 'The merged intervals, one per line as "start end", sorted by start.',
    constraints: ['1 <= n <= 10000', 'start <= end for every interval'],
    examples: [
      { input: '4\n1 3\n2 6\n8 10\n15 18', output: '1 6\n8 10\n15 18', note: '1 3 and 2 6 overlap and become 1 6.' },
    ],
    tests: [
      { input: '4\n1 3\n2 6\n8 10\n15 18', expected: '1 6\n8 10\n15 18' },
      { input: '2\n1 4\n4 5', expected: '1 5' },
      { input: '3\n1 4\n0 4\n3 5', expected: '0 5' },
      { input: '1\n5 7', expected: '5 7' },
      { input: '5\n1 10\n2 3\n4 5\n6 7\n8 9', expected: '1 10' },
      { input: '3\n6 8\n1 9\n2 4', expected: '1 9' },
    ],
    hints: [
      'Merging is easy when intervals are processed in order of their start.',
      'Sort by start, keep a current interval and compare it with each next one.',
      'If next.start <= current.end, extend current.end = max(current.end, next.end); otherwise output current and start a new one.',
    ],
    approach:
      'Sort the intervals by start, then sweep once, extending the current interval while the next one overlaps or touches it. Time O(n log n) because of the sort, space O(n).',
    starter: `n = int(input())
intervals = [tuple(map(int, input().split())) for _ in range(n)]

# Print the merged intervals, one "start end" per line
`,
  },
  {
    id: 'number-of-islands',
    title: 'Number of Islands',
    difficulty: 'Medium',
    topic: 'Graphs',
    description:
      'A grid contains 1 for land and 0 for water. An island is a group of land cells connected horizontally or vertically. Count the islands.',
    input: 'Line 1: r and c (rows and columns)\nNext r lines: a string of c characters, each 0 or 1.',
    output: 'The number of islands.',
    constraints: ['1 <= r, c <= 300'],
    examples: [{ input: '4 5\n11000\n11000\n00100\n00011', output: '3' }],
    tests: [
      { input: '4 5\n11000\n11000\n00100\n00011', expected: '3' },
      { input: '4 5\n11110\n11010\n11000\n00000', expected: '1' },
      { input: '1 1\n1', expected: '1' },
      { input: '1 1\n0', expected: '0' },
      { input: '3 3\n101\n010\n101', expected: '5' },
      { input: '2 4\n1111\n1111', expected: '1' },
    ],
    hints: [
      'Each island is one connected group of land cells. You need to count the groups.',
      'When you find a land cell you have not visited, explore the whole island from it with DFS or BFS and mark every cell visited.',
      'The number of times you start a new exploration is the answer. Prefer BFS or an explicit stack to avoid deep recursion in Python.',
    ],
    approach:
      'Flood fill. Scan every cell; each unvisited land cell starts a new island, and a BFS/DFS marks all connected land cells as visited. Time O(r * c), space O(r * c).',
    starter: `r, c = map(int, input().split())
grid = [input().strip() for _ in range(r)]

# Print the number of islands
`,
  },
  {
    id: 'reverse-words',
    title: 'Reverse Words',
    difficulty: 'Easy',
    topic: 'Strings',
    description: 'Given a sentence, print its words in reverse order.',
    input: 'A single line of words separated by single spaces.',
    output: 'The same words in reverse order, separated by single spaces.',
    constraints: ['1 <= number of words <= 10000'],
    examples: [{ input: 'the sky is blue', output: 'blue is sky the' }],
    tests: [
      { input: 'the sky is blue', expected: 'blue is sky the' },
      { input: 'hello', expected: 'hello' },
      { input: 'a b c', expected: 'c b a' },
      { input: 'coding is fun', expected: 'fun is coding' },
      { input: 'one two', expected: 'two one' },
    ],
    hints: [
      'Split the line into a list of words.',
      'Reverse the list instead of reversing characters.',
      'Join the reversed list back together with a single space.',
    ],
    approach: 'Split on whitespace, reverse the list of words and join with one space. Time O(n), space O(n).',
    starter: `line = input()

# Print the words in reverse order
`,
  },
  {
    id: 'anagram-check',
    title: 'Valid Anagram',
    difficulty: 'Easy',
    topic: 'Hashing',
    description: 'Two strings are anagrams if one can be rearranged into the other using every letter exactly once. Decide whether two strings are anagrams.',
    input: 'Line 1: the first string\nLine 2: the second string (lowercase letters only)',
    output: 'true if they are anagrams, otherwise false (lowercase).',
    constraints: ['1 <= length <= 50000'],
    examples: [{ input: 'listen\nsilent', output: 'true' }],
    tests: [
      { input: 'listen\nsilent', expected: 'true' },
      { input: 'rat\ncar', expected: 'false' },
      { input: 'a\na', expected: 'true' },
      { input: 'abc\nabcd', expected: 'false' },
      { input: 'anagram\nnagaram', expected: 'true' },
      { input: 'aab\nabb', expected: 'false' },
    ],
    hints: [
      'If the lengths differ, the answer is immediately false.',
      'Anagrams have exactly the same count of every letter.',
      'Count letters of the first string with a hash map (or array of 26), then subtract using the second.',
    ],
    approach: 'Compare letter frequencies. Count every character of the first string, decrement for the second, and check that all counts are zero. Time O(n), space O(1) for a fixed alphabet.',
    starter: `a = input().strip()
b = input().strip()

# Print true or false
`,
  },
  {
    id: 'missing-number',
    title: 'Missing Number',
    difficulty: 'Easy',
    topic: 'Math',
    description: 'You are given n distinct numbers taken from the range 0 to n. Exactly one number from that range is missing. Find it.',
    input: 'Line 1: n\nLine 2: n distinct integers in the range 0..n',
    output: 'The missing number.',
    constraints: ['1 <= n <= 100000'],
    examples: [{ input: '3\n3 0 1', output: '2' }],
    tests: [
      { input: '3\n3 0 1', expected: '2' },
      { input: '2\n0 1', expected: '2' },
      { input: '1\n1', expected: '0' },
      { input: '9\n9 6 4 2 3 5 7 0 1', expected: '8' },
      { input: '4\n0 1 2 4', expected: '3' },
    ],
    hints: [
      'The numbers 0..n have a known total. Compare it with the sum of the input.',
      'The sum of 0..n is n * (n + 1) / 2.',
      'XOR-ing all indices and values also leaves only the missing number.',
    ],
    approach: 'Expected sum is n(n+1)/2. Subtract the actual sum of the input to get the missing value. Time O(n), space O(1).',
    starter: `n = int(input())
nums = list(map(int, input().split()))

# Print the missing number
`,
  },
  {
    id: 'best-time-to-buy-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    topic: 'Arrays & Hashing',
    description: 'Given the price of a stock on each day, find the maximum profit from buying on one day and selling on a later day. If no profit is possible, print 0.',
    input: 'Line 1: n (number of days)\nLine 2: n prices',
    output: 'The maximum profit, or 0.',
    constraints: ['1 <= n <= 100000', '0 <= price <= 10000'],
    examples: [{ input: '6\n7 1 5 3 6 4', output: '5', note: 'Buy at 1, sell at 6.' }],
    tests: [
      { input: '6\n7 1 5 3 6 4', expected: '5' },
      { input: '5\n7 6 4 3 1', expected: '0' },
      { input: '1\n5', expected: '0' },
      { input: '2\n1 2', expected: '1' },
      { input: '5\n2 4 1 7 3', expected: '6' },
    ],
    hints: [
      'Trying every pair of days is O(n^2).',
      'While scanning, remember the lowest price seen so far.',
      'At each day, the best profit selling today is price - lowest_so_far.',
    ],
    approach: 'Single pass: track the minimum price so far and the best profit seen. Time O(n), space O(1).',
    starter: `n = int(input())
prices = list(map(int, input().split()))

# Print the maximum profit
`,
  },
  {
    id: 'count-primes',
    title: 'Count Primes',
    difficulty: 'Medium',
    topic: 'Math',
    description: 'Count how many prime numbers are strictly less than n.',
    input: 'A single integer n.',
    output: 'The number of primes less than n.',
    constraints: ['0 <= n <= 5000000'],
    examples: [{ input: '10', output: '4', note: 'The primes are 2, 3, 5 and 7.' }],
    tests: [
      { input: '10', expected: '4' },
      { input: '0', expected: '0' },
      { input: '1', expected: '0' },
      { input: '2', expected: '0' },
      { input: '3', expected: '1' },
      { input: '100', expected: '25' },
      { input: '1000', expected: '168' },
    ],
    hints: [
      'Testing every number with trial division is too slow for large n.',
      'The Sieve of Eratosthenes marks multiples of each prime as not prime.',
      'Start marking from p * p, and only for p up to the square root of n.',
    ],
    approach: 'Sieve of Eratosthenes: keep a boolean array, and for each prime p starting at 2 mark p*p, p*p+p, ... as composite. Count the remaining true values. Time O(n log log n), space O(n).',
    starter: `n = int(input())

# Print the number of primes less than n
`,
  },
  {
    id: 'rotate-array',
    title: 'Rotate Array',
    difficulty: 'Medium',
    topic: 'Arrays & Hashing',
    description: 'Rotate an array to the right by k steps. Each step moves the last element to the front.',
    input: 'Line 1: n and k\nLine 2: n integers',
    output: 'The rotated array as space-separated integers.',
    constraints: ['1 <= n <= 100000', '0 <= k <= 1000000000 (k can be larger than n)'],
    examples: [{ input: '7 3\n1 2 3 4 5 6 7', output: '5 6 7 1 2 3 4' }],
    tests: [
      { input: '7 3\n1 2 3 4 5 6 7', expected: '5 6 7 1 2 3 4' },
      { input: '2 3\n1 2', expected: '2 1' },
      { input: '3 0\n1 2 3', expected: '1 2 3' },
      { input: '1 5\n9', expected: '9' },
      { input: '4 1\n-1 -100 3 99', expected: '99 -1 -100 3' },
    ],
    hints: [
      'Rotating by n steps gives the original array back. Reduce k first.',
      'After k = k % n, the last k elements move to the front.',
      'In Python, slicing makes this a one-liner: a[-k:] + a[:-k] (careful when k is 0).',
    ],
    approach: 'Use k = k % n. The result is the last k elements followed by the first n - k elements. Time O(n), space O(n).',
    starter: `n, k = map(int, input().split())
nums = list(map(int, input().split()))

# Print the rotated array separated by spaces
`,
  },
  {
    id: 'product-except-self',
    title: 'Product of Array Except Self',
    difficulty: 'Medium',
    topic: 'Arrays & Hashing',
    description: 'For each position, print the product of all the other elements of the array. Try to solve it without using division.',
    input: 'Line 1: n\nLine 2: n integers',
    output: 'n space-separated integers: output[i] is the product of every element except nums[i].',
    constraints: ['2 <= n <= 100000', 'The result of every product fits in a 32-bit integer'],
    examples: [{ input: '4\n1 2 3 4', output: '24 12 8 6' }],
    tests: [
      { input: '4\n1 2 3 4', expected: '24 12 8 6' },
      { input: '5\n-1 1 0 -3 3', expected: '0 0 9 0 0' },
      { input: '2\n3 4', expected: '4 3' },
      { input: '3\n2 0 5', expected: '0 10 0' },
      { input: '3\n1 1 1', expected: '1 1 1' },
    ],
    hints: [
      'The answer for index i is (product of everything to the left) * (product of everything to the right).',
      'Compute a prefix product array in one pass.',
      'Then sweep from the right keeping a running suffix product and multiply it in.',
    ],
    approach: 'Two passes. First store prefix products in the result, then walk from the right with a running suffix product and multiply it into each position. Time O(n), extra space O(1) besides the output.',
    starter: `n = int(input())
nums = list(map(int, input().split()))

# Print the products separated by spaces
`,
  },
  {
    id: 'coin-change',
    title: 'Coin Change',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    description: 'Given coin denominations (each available in unlimited quantity) and a target amount, find the fewest coins needed to make that amount. If it is impossible, print -1.',
    input: 'Line 1: the amount\nLine 2: n (number of denominations)\nLine 3: n coin values',
    output: 'The minimum number of coins, or -1.',
    constraints: ['0 <= amount <= 10000', '1 <= n <= 12', '1 <= coin <= 10000'],
    examples: [{ input: '11\n3\n1 2 5', output: '3', note: '5 + 5 + 1' }],
    tests: [
      { input: '11\n3\n1 2 5', expected: '3' },
      { input: '3\n1\n2', expected: '-1' },
      { input: '0\n1\n1', expected: '0' },
      { input: '12\n3\n1 5 10', expected: '3' },
      { input: '7\n3\n2 4 6', expected: '-1' },
      { input: '6\n3\n1 3 4', expected: '2' },
    ],
    hints: [
      'A greedy choice (always take the largest coin) fails for some coin sets, for example 1 3 4 with amount 6.',
      'Let dp[a] be the fewest coins that make amount a. What does dp[a] depend on?',
      'dp[a] = 1 + min(dp[a - coin]) over every coin <= a. Use infinity for unreachable amounts.',
    ],
    approach: 'Bottom-up DP over amounts 0..amount with dp[0] = 0. For each amount try every coin and keep the minimum. Time O(amount * n), space O(amount).',
    starter: `amount = int(input())
n = int(input())
coins = list(map(int, input().split()))

# Print the fewest coins, or -1
`,
  },
  {
    id: 'kth-largest',
    title: 'Kth Largest Element',
    difficulty: 'Medium',
    topic: 'Heaps',
    description: 'Find the kth largest element of an array. The array is not sorted, and k = 1 means the largest element.',
    input: 'Line 1: n and k\nLine 2: n integers',
    output: 'The kth largest element.',
    constraints: ['1 <= k <= n <= 100000'],
    examples: [{ input: '6 2\n3 2 1 5 6 4', output: '5' }],
    tests: [
      { input: '6 2\n3 2 1 5 6 4', expected: '5' },
      { input: '9 4\n3 2 3 1 2 4 5 5 6', expected: '4' },
      { input: '1 1\n7', expected: '7' },
      { input: '5 5\n9 8 7 6 5', expected: '5' },
      { input: '4 1\n-1 -5 -3 -2', expected: '-1' },
    ],
    hints: [
      'Sorting the whole array in descending order solves it in O(n log n).',
      'You only need to keep track of the k largest values seen so far.',
      'A min-heap of size k works: after processing everything, the heap root is the answer.',
    ],
    approach: 'Maintain a min-heap with at most k elements. For each number push it, and if the heap grows past k pop the smallest. The root is the kth largest. Time O(n log k), space O(k).',
    starter: `import heapq

n, k = map(int, input().split())
nums = list(map(int, input().split()))

# Print the kth largest element
`,
  },
  {
    id: 'longest-common-subsequence',
    title: 'Longest Common Subsequence',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    description: 'A subsequence keeps the original order but may skip characters. Find the length of the longest subsequence shared by two strings.',
    input: 'Line 1: the first string\nLine 2: the second string (lowercase letters)',
    output: 'The length of the longest common subsequence.',
    constraints: ['1 <= length <= 1000'],
    examples: [{ input: 'abcde\nace', output: '3', note: 'The subsequence is ace.' }],
    tests: [
      { input: 'abcde\nace', expected: '3' },
      { input: 'abc\nabc', expected: '3' },
      { input: 'abc\ndef', expected: '0' },
      { input: 'aggtab\ngxtxayb', expected: '4' },
      { input: 'a\na', expected: '1' },
      { input: 'bl\nyby', expected: '1' },
    ],
    hints: [
      'Define dp[i][j] as the LCS length of the first i characters of a and the first j characters of b.',
      'If a[i-1] == b[j-1], the characters match and dp[i][j] = dp[i-1][j-1] + 1.',
      'Otherwise dp[i][j] = max(dp[i-1][j], dp[i][j-1]).',
    ],
    approach: 'Classic 2D DP table of size (len(a)+1) x (len(b)+1). Fill row by row using the match / no-match recurrence; the answer is the bottom-right cell. Time O(n*m), space O(n*m) (or O(m) with two rows).',
    starter: `a = input().strip()
b = input().strip()

# Print the length of the longest common subsequence
`,
  },
]

export const TOPICS = [...new Set(PROBLEMS.map((p) => p.topic))].sort()

export const getProblem = (id) => PROBLEMS.find((p) => p.id === id) || null

/** Plain-text statement that is stored in the room and shown to every participant. */
export function buildQuestionText(problem) {
  const lines = [
    `${problem.title} (${problem.difficulty})`,
    '',
    problem.description,
    '',
    'Input',
    problem.input,
    '',
    'Output',
    problem.output,
  ]
  if (problem.constraints.length) {
    lines.push('', 'Constraints', ...problem.constraints.map((c) => `- ${c}`))
  }
  problem.examples.forEach((example, index) => {
    lines.push('', `Example ${index + 1}`, 'Input:', example.input, 'Output:', example.output)
    if (example.note) lines.push(`Explanation: ${example.note}`)
  })
  return lines.join('\n')
}

/** Consecutive days (ending today or yesterday) with at least one test run. */
export function computeStreak(timestamps) {
  const dayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  const days = new Set(timestamps.map((t) => dayKey(new Date(t))))
  const cursor = new Date()
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

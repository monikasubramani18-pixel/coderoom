export const LANGUAGES = [
  { id: 'python', label: 'Python', filename: 'main.py' },
  { id: 'javascript', label: 'JavaScript', filename: 'main.js' },
  { id: 'java', label: 'Java', filename: 'Main.java' },
  { id: 'c', label: 'C', filename: 'main.c' },
  { id: 'cpp', label: 'C++', filename: 'main.cpp' },
]

// Starter code. The python entry must match DEFAULT_CODE in backend/routers/rooms.py.
export const TEMPLATES = {
  python: 'print("Hello, CodeRoom!")\n',
  javascript: 'console.log("Hello, CodeRoom!");\n',
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, CodeRoom!");
    }
}
`,
  c: `#include <stdio.h>

int main(void) {
    printf("Hello, CodeRoom!\\n");
    return 0;
}
`,
  cpp: `#include <iostream>

int main() {
    std::cout << "Hello, CodeRoom!" << std::endl;
    return 0;
}
`,
}

export const languageMeta = (id) => LANGUAGES.find((l) => l.id === id) || LANGUAGES[0]

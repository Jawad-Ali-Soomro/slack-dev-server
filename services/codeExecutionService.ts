/**
 * Code Execution Service
 * Executes user code in a safe environment and returns output
 */

export class CodeExecutionService {
  /**
   * Execute JavaScript code and return output
   * Note: In production, use a proper sandbox like Docker, VM2, or external API
   */
  static executeJavaScript(code: string, testInput?: string): { output: string; error: string | null } {
    try {
      // Create a safe execution context
      const vm = require('vm');
      
      // Capture console.log and return values
      let output = '';
      let returnValue: any = undefined;
      
      const context = {
        console: {
          log: (...args: any[]) => {
            output += args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ') + '\n';
          }
        },
        // Add common utilities
        Math,
        Array,
        Object,
        String,
        Number,
        Date,
        JSON,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        require: () => { throw new Error('require is not allowed'); },
        process: undefined,
        global: undefined,
        Buffer: undefined,
        __dirname: undefined,
        __filename: undefined
      };
      
      // Create VM context
      const vmContext = vm.createContext(context);
      
      // Prepare the code with test input if provided
      let executionCode = code;
      if (testInput) {
        // Try to parse and inject test input
        try {
          const parsedInput = JSON.parse(testInput);
          
          // Check if code is a function declaration or arrow function
          const isFunction = code.trim().match(/^(function\s+\w+|function\s*\(|\w+\s*=\s*function|\w+\s*=>|\([^)]*\)\s*=>)/);
          
          if (isFunction) {
            // Code is already a function, just call it
            if (Array.isArray(parsedInput)) {
              executionCode = `(${code})(${parsedInput.map((arg: any) => JSON.stringify(arg)).join(', ')})`;
            } else {
              executionCode = `(${code})(${JSON.stringify(parsedInput)})`;
            }
          } else {
            // Code is not a function, wrap it and try to extract function name or create one
            // Look for function name pattern: function name(...) or const name = ...
            const functionMatch = code.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|let\s+(\w+)\s*=|var\s+(\w+)\s*=)/);
            const functionName = functionMatch ? (functionMatch[1] || functionMatch[2] || functionMatch[3] || functionMatch[4]) : null;
            
            if (functionName) {
              // Found a function name, call it
              if (Array.isArray(parsedInput)) {
                executionCode = `${code}; ${functionName}(${parsedInput.map((arg: any) => JSON.stringify(arg)).join(', ')})`;
              } else {
                executionCode = `${code}; ${functionName}(${JSON.stringify(parsedInput)})`;
              }
            } else {
              // No function found, wrap code and return the result
              if (Array.isArray(parsedInput)) {
                executionCode = `(function() { ${code}; })()`;
              } else {
                executionCode = `(function() { ${code}; })()`;
              }
            }
          }
        } catch {
          // If parsing fails, use as string
          const isFunction = code.trim().match(/^(function\s+\w+|function\s*\(|\w+\s*=\s*function|\w+\s*=>|\([^)]*\)\s*=>)/);
          if (isFunction) {
            executionCode = `(${code})(${JSON.stringify(testInput)})`;
          } else {
            executionCode = `(function() { ${code}; })()`;
          }
        }
      }
      
      // Execute code
      try {
        returnValue = vm.runInContext(executionCode, vmContext, {
          timeout: 5000, // 5 second timeout
          displayErrors: true
        });
      } catch (execError: any) {
        return {
          output: '',
          error: execError.message || 'Execution error'
        };
      }
      
      // If there's a return value, add it to output
      if (returnValue !== undefined) {
        if (typeof returnValue === 'object') {
          output += JSON.stringify(returnValue);
        } else {
          output += String(returnValue);
        }
      }
      
      return {
        output: output.trim(),
        error: null
      };
    } catch (error: any) {
      return {
        output: '',
        error: error.message || 'Code execution failed'
      };
    }
  }
  
  /**
   * Evaluate solution against test cases
   */
  static evaluateSolution(
    userCode: string,
    testCases: Array<{ input: string; expectedOutput: string; description?: string }>
  ): { passed: number; total: number; results: Array<{ passed: boolean; input: string; expected: string; actual: string; error?: string }> } {
    const results: Array<{ passed: boolean; input: string; expected: string; actual: string; error?: string }> = [];
    let passed = 0;
    
    for (const testCase of testCases) {
      const executionResult = this.executeJavaScript(userCode, testCase.input);
      
      if (executionResult.error) {
        results.push({
          passed: false,
          input: testCase.input,
          expected: testCase.expectedOutput,
          actual: '',
          error: executionResult.error
        });
      } else {
        const actualOutput = executionResult.output.trim();
        const expectedOutput = testCase.expectedOutput.trim();
        
        // Normalize outputs for comparison
        const normalizedActual = this.normalizeOutput(actualOutput);
        const normalizedExpected = this.normalizeOutput(expectedOutput);
        
        const isPassed = normalizedActual === normalizedExpected;
        
        if (isPassed) {
          passed++;
        }
        
        results.push({
          passed: isPassed,
          input: testCase.input,
          expected: expectedOutput,
          actual: actualOutput,
          error: executionResult.error || undefined
        });
      }
    }
    
    return {
      passed,
      total: testCases.length,
      results
    };
  }
  
  /**
   * Normalize output for comparison
   */
  private static normalizeOutput(output: string): string {
    // Remove extra whitespace
    return output.replace(/\s+/g, ' ').trim().toLowerCase();
  }
  
  /**
   * Check if solution is correct based on test cases
   */
  static isSolutionCorrect(
    userCode: string,
    testCases: Array<{ input: string; expectedOutput: string; description?: string }>
  ): boolean {
    if (!userCode || !userCode.trim()) {
      return false;
    }
    
    if (!testCases || testCases.length === 0) {
      // If no test cases, we can't evaluate
      return false;
    }
    
    const evaluation = this.evaluateSolution(userCode, testCases);
    
    // Solution is correct if all test cases pass
    return evaluation.passed === evaluation.total && evaluation.total > 0;
  }
}


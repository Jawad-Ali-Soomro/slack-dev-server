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

      const vm = require('vm');

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

      const vmContext = vm.createContext(context);

      let executionCode = code;
      if (testInput) {

        try {
          const parsedInput = JSON.parse(testInput);

          const isFunction = code.trim().match(/^(function\s+\w+|function\s*\(|\w+\s*=\s*function|\w+\s*=>|\([^)]*\)\s*=>)/);
          
          if (isFunction) {

            if (Array.isArray(parsedInput)) {
              executionCode = `(${code})(${parsedInput.map((arg: any) => JSON.stringify(arg)).join(', ')})`;
            } else {
              executionCode = `(${code})(${JSON.stringify(parsedInput)})`;
            }
          } else {


            const functionMatch = code.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|let\s+(\w+)\s*=|var\s+(\w+)\s*=)/);
            const functionName = functionMatch ? (functionMatch[1] || functionMatch[2] || functionMatch[3] || functionMatch[4]) : null;
            
            if (functionName) {

              if (Array.isArray(parsedInput)) {
                executionCode = `${code}; ${functionName}(${parsedInput.map((arg: any) => JSON.stringify(arg)).join(', ')})`;
              } else {
                executionCode = `${code}; ${functionName}(${JSON.stringify(parsedInput)})`;
              }
            } else {

              if (Array.isArray(parsedInput)) {
                executionCode = `(function() { ${code}; })()`;
              } else {
                executionCode = `(function() { ${code}; })()`;
              }
            }
          }
        } catch {

          const isFunction = code.trim().match(/^(function\s+\w+|function\s*\(|\w+\s*=\s*function|\w+\s*=>|\([^)]*\)\s*=>)/);
          if (isFunction) {
            executionCode = `(${code})(${JSON.stringify(testInput)})`;
          } else {
            executionCode = `(function() { ${code}; })()`;
          }
        }
      }

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

      return false;
    }
    
    const evaluation = this.evaluateSolution(userCode, testCases);

    return evaluation.passed === evaluation.total && evaluation.total > 0;
  }
}


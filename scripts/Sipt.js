Sipt = function(Str = null)
{
	// Variables [int stackid (0 is global): {key => value}]
	this.Variables = [];

	// Methods [int stackid (0 is global): {key => value}]
	this.Methods = [{
		Log: {
			Body: function(string){
				console.log(string);
			}
		},
		Alert: {
			Body: function(string){
				alert(string);
			}
		}
	}];

	// Current stackid
	this.CurrentStackID = -1;

	// Executes a Sipt string
	this.Execute = function(Str)
	{
		this.CurrentStackID++;
		Str = this.FindSetCleanMethodsFromString(Str);
		return this.RunCommands(Str);
	}

	this.FindSetCleanMethodsFromString = function(Str)
	{
		// Loop through defined methods
		var MethodsRegex = /def ([a-z]+\d*)\s*\(([^\(\)]*)\)\s*{([\s\S]*)}/gi;
		while((Result = MethodsRegex.exec(Str)) !== null)
		{
			var params = [];
			if(Result[2].length > 0)
			{
				params = Result[2].split(",");
				for(var I in params) params[I] = params[I].trim();
			}

			this.SetMethod(Result[1], params, Result[3]);
			Str = Str.replace(Result[0], "");
		}

		// Set params for source methods
		for(var I in this.Methods[0])
		{
			if(typeof(this.Methods[0][I].Body) === "function")
			{
				this.Methods[0][I].Params = this.GetFuncArgs(this.Methods[0][I].Body);
			}
		}

		return Str;
	}

	// Runs commands, returns if reaches return statement
	this.RunCommands = function(Str)
	{
		var CommandsRegex = /\s*(.*[^\s*])\s*;/gi;
		while((Result = CommandsRegex.exec(Str)) !== null)
		{
			if((Value = this.RunCommand(Result[1])) != null)
				return Value;
		}

		return null;
	}

	// Runs command, returns if return statment
	this.RunCommand = function(Str)
	{
		// Comment
		if(Str.substr(0, 2) == "//")
			return null;

		// Type: Assign
		var CheckAssign = /([^\s]*)\s*=(.*)/gi;
		if((Result = CheckAssign.exec(Str)) !== null)
		{
			return this.SetVariable(Result[1], Result[2]);
		}

		// Type: Return
		var CheckReturn = /return\s(.*)/gi;
		if((Result = CheckReturn.exec(Str)) !== null)
		{
			return this.Evaluate(Result[1]);
		}

		// Type: Express
		var CheckExpression = /(.*)/gi;
		if((Result = CheckExpression.exec(Str)) !== null)
		{
			return this.Evaluate(Result[1]);
		}

		return null;
	}

	// Sets variable on current stackid, if StackID parameter is a value variable will be set on that stackid
	this.SetVariable = function(Alias, Expression, StackID = null)
	{
		if(StackID == null)
			StackID = this.CurrentStackID;

		if(this.Variables[StackID] === undefined)
			this.Variables[StackID] = {};

		this.Variables[StackID][Alias] = this.Evaluate(Expression);

		return null;
	}

	// Sets method on current stackid, if StackID parameter is a value method will be set on that stackid
	this.SetMethod = function(Alias, params = [], MethodBody = "", StackID = null)
	{
		if(StackID == null)
			StackID = this.CurrentStackID;

		if(this.Methods[StackID] === undefined)
			this.Methods[StackID] = {};

		// Method needs sorting here before applying
		// Add to methods
		this.Methods[StackID][Alias] = {
			Params: params,
			Body: MethodBody
		}

		return null;
	}

	this.SetSourceMethod = function(Alias, Func)
	{
		S1.Methods[0][Alias] = {
			Body: Func
		}
	}

	// Returns variable from current/global stackid, null if doesn't exist
	this.GetVariable = function(Alias)
	{
		var StackID = this.CurrentStackID;

		if(this.Variables[StackID] != null) return this.Variables[StackID][Alias];
		else if(this.Variables[0] != null) return this.Variables[0][Alias];
		else return null;
	}

	// Returns method from current/global stackid, null if doesn't exist
	this.GetMethod = function(Alias)
	{
		var StackID = this.CurrentStackID;

		if(this.Methods[StackID][Alias] != null) return this.Methods[StackID][Alias];
		else if(this.Methods[0][Alias] != null) return this.Methods[0][Alias];
		else return null;
	}

	// Runs method on current/global stackid, returns null if doesn't exist
	this.RunMethod = function(Alias, Parameters = [])
	{
		var Method = this.GetMethod(Alias);
		
		var OriginalStackID = this.CurrentStackID;
		this.CurrentStackID++;

		for(var I in Parameters)
			this.SetVariable(Method.Params[I], Parameters[I]);

		var Value = (typeof(Method.Body) !== "function")
			? this.RunCommands(Method.Body)
			: Method.Body.apply(this, Parameters);

		this.CurrentStackID  = OriginalStackID;

		return Value;
	}

	// Evaluates given expression string
	this.Evaluate = function(Expression = "")
	{
		var FinalResult = Expression;

		// Express: Methods 
		var MethodsRegex = /[a-z]+\d*\(.*\)/gi;
		while((MethodResult = MethodsRegex.exec(FinalResult)) !== null)
		{
			var MethodResult = /(\w+)\((.*)\)/gi.exec(MethodResult[0]);

			var params = [];
			var ParamResults = MethodResult[2].split(/,(?=(?:"[^"]*"|\([^()]*\)|\[[^\[\]]*\]|\{[^{}]*}|[^"\[{}()\]])*$)/);
			for(var I in ParamResults)
				params.push(this.Evaluate(ParamResults[I].trim()));

			FinalResult = FinalResult.replace(MethodResult[0], this.RunMethod(MethodResult[1], params));
		}

		// Express: Variables
		var VariablesRegex = /\w+(?=(?:[^"]*"[^"]*")*[^"]*$)/gi;
		while((VariableResult = VariablesRegex.exec(FinalResult)) !== null)
		{
			var Value = this.GetVariable(VariableResult[0]);

			if(Value != null)
				FinalResult = FinalResult.replace(VariableResult[0], this.GetVariable(VariableResult[0]));
		}

		// Try to evaluate as numeric
		try
		{
			FinalResult = math.eval(FinalResult);
		}
		// Else build string
		catch(e)
		{
			var NewString = "";
			ConcatStrings = FinalResult.split(/\s*\+\s*/gi);
			for(var I in ConcatStrings)
				NewString += ConcatStrings[I].replace(/"/g, "");
			
			FinalResult = NewString;
		}

		// Return evaluated expression
		return FinalResult;
	}

	this.GetFuncArgs = function(func) {
		// First match everything inside the function argument parens.
		var args = func.toString().match(/function\s.*?\(([^)]*)\)/)[1];
	
		// Split the arguments string into an array comma delimited.
		return args.split(',').map(function(arg){
			// Ensure no inline comments are parsed and trim the whitespace.
			return arg.replace(/\/\*.*\*\//, '').trim();})
		.filter(function(arg) {
			// Ensure no undefined values are added.
			return arg;
		});
	}

	// Execute
	if(Str != null)
		this.Execute(Str);
}
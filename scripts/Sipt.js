Sipt = function(Str = null)
{
	// Variables [int stackid (0 is global): {key => value}]
	this.Variables = [];

	// Methods [int stackid (0 is global): {key => value}]
	this.Methods = [{
		GetStackID: {
			Body: function(){
				return this.CurrentStackID-1;
			}
		},
		Log: {
			Body: function(string){
				console.log(string);
			}
		},
		Alert: {
			Body: function(string){
				alert(string);
			}
		},
		Wait: {
			Body: function(t){
				this.Paused = true;
				setTimeout(() => {
					this.Paused = false;
				}, t);
			}
		}
	}];

	// Current stackid
	this.CurrentStackID = 0;

	// Executes a Sipt string
	this.Execute = function(Str)
	{
		this.CurrentStackID = 0;
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
		Str = this.FindSetCleanMethodsFromString(Str);

		var CommandsRegex = /\s*(.*)[^\s]*;|(if)\s*\(\s*(.*)\s*\)\s*{\s*([\s\S]*)\s*}(else)\s*{\s*([\s\S]*)\s*}/gi;

		var CommandsArray = [];
		while((Result = CommandsRegex.exec(Str)) !== null)
			CommandsArray.push(Result);

		return this.ContinueCommand(CommandsArray);
	}

	this.ContinueCommand = function(CommandsArray, I = 0, Value = null)
	{
		if(I < CommandsArray.length)
		{
			if(!this.Paused)
			{
				Value = this.ResultCommand(CommandsArray[I]);
				return this.ContinueCommand(CommandsArray, ++I, Value);
			}
			else
			{
				var PausedInterval = setInterval(() => {
					if(!this.Paused)
					{
						Value = this.ResultCommand(CommandsArray[I]);
						this.ContinueCommand(CommandsArray, ++I, Value);
						clearInterval(PausedInterval);
					}
				}, 0);
			}
		}

		return Value;
	}

	this.ResultCommand = function(Result)
	{
		// If statement
		if(Result[2] != undefined){
			if(this.Evaluate(Result[3])){
				Value = this.RunCommands(Result[4]);
			}else if(Result[5] != undefined){
				if(this.Evaluate(Result[5]))
					Value = this.RunCommands(Result[6]);
			}
		}
		else
		{
			Value = this.RunCommand(Result[1]);
		}

		return Value;
	}

	// Runs command, returns if return statment
	this.RunCommand = function(Str)
	{
		// Trim
		Str = Str.trim();

		// Comment
		if(Str.substr(0, 2) == "//")
			return;

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
		// If function body passed as params
		if(typeof(params) === "function")
		{
			S1.Methods[0][Alias] = {Body: params}
			return null;
		}

		if(StackID == null)
			StackID = this.CurrentStackID;

		if(this.Methods[StackID] === undefined)
			this.Methods[StackID] = {};

		// Add to methods
		this.Methods[StackID][Alias] = {
			Params: params,
			Body: MethodBody
		}

		return null;
	}

	// Returns variable from current/global stackid, null if doesn't exist
	this.GetVariable = function(Alias)
	{
		for(var ID = this.CurrentStackID; ID >= 0; ID--)
		{
			if(this.Variables[ID] != undefined)
			{
				if(this.Variables[ID][Alias] != undefined)
					return this.Variables[ID][Alias];
			}
		}

		return null;
	}

	// Returns method from current/global stackid, null if doesn't exist
	this.GetMethod = function(Alias)
	{
		for(var ID = this.CurrentStackID; ID >= 0; ID--)
		{
			if(this.Methods[ID] != undefined)
			{
				if(this.Methods[ID][Alias] != undefined)
					return this.Methods[ID][Alias];
			}
		}

		return null;
	}

	// Runs method on current/global stackid, returns null if doesn't exist
	this.RunMethod = function(Alias, Parameters = [])
	{
		if(this.CurrentStackID >= 1000)
		{
			console.log("Sipt: Stack overflow");
			return;
		}

		var Method = this.GetMethod(Alias);
		this.CurrentStackID++;

		for(var I in Parameters)
			this.SetVariable(Method.Params[I], Parameters[I]);

		var Value = (typeof(Method.Body) !== "function")
			? this.RunCommands(Method.Body)
			: Method.Body.apply(this, Parameters);

		this.CurrentStackID--;

		return Value;
	}

	// Evaluates given expression string
	this.Evaluate = function(Expression = "")
	{
		if(Expression === undefined || Expression === null || Expression == "")
			return;

		var FinalResult = Expression;

		if(isNaN(FinalResult))
			FinalResult = FinalResult.trim();

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
		var VariablesRegex = /[a-z0-9]+(?=(?:[^"]*"[^"]*")*[^"]*$)/gi;
		while((VariableResult = VariablesRegex.exec(FinalResult)) !== null)
		{
			if(VariableResult[0] == undefined) continue;

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
			// Try to build string
			try
			{
				var NewString = "";
				ConcatStrings = FinalResult.split(/\s*\+\s*/gi);
				for(var I in ConcatStrings)
					NewString += ConcatStrings[I].replace(/"/g, "");
				
				FinalResult = NewString;
			}
			// Else return whether true or false
			catch(e)
			{
				// Probably a conditional statement
			}
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
Sipt = function(Str)
{
	this.Variables = {};
	this.Methods = {};
	this.ExecVars = {};
	this.ExecID = 0;
	this.Return = null;

	this.Execute = function(Str, TopLevelVars = true)
	{
		this.ExecID++;
		this.ExecVars[this.ExecID] = {};
		
		var MethodsRegex = /def ([^ ]*)\s*{([^}]*)}/g;
		while((Result = MethodsRegex.exec(Str)) !== null)
		{
			this.Methods[Result[1]] = Result[2].trim();
			Str = Str.replace(Result[0], "");
		}
		
		Str = Str.trim();
		var Commands = Str.split(";");
		for(var I in Commands)
		{
			var Ret = this.RunCommand(Commands[I], TopLevelVars);
			if(Ret !== null) return Ret;
		}
		delete this.ExecVars[this.ExecID];
	}

	this.RunCommand = function(Str, TopLevelVars = true)
	{
		Str = Str.trim();
		Str = Str.replace(/\s\s+/g, ' ');
		Str = Str.replace(/\t/g, ' ');
		if(Str == "") return null;
		var Workings = /\[(.*?)\]/g;
		while ((Result = Workings.exec(Str)) !== null) Str = Str.replace(Result[0], this.Eval(Result[1]));
		var Words = Str.split(" ");
		if(Words[0] != "ret" && Words[1] == "=") Words.unshift("def");
		if((Words[0] == "def") && Words[2] == "=")
		{
			this.ExecVars[this.ExecID][Words[1]] = Words.slice(3).join(" ");
			if(TopLevelVars) this.Variables[Words[1]] = this.ExecVars[this.ExecID][Words[1]];
		}
		else if(Words[0] == "ret")
		{
			return Words.slice(1).join(" ");
		}
		return null;
	}

	this.Eval = function(Str)
	{
		var FinalWords = [];
		var Words = Str.split(" ");
		for(var X in Words)
		{
			var Word = Words[X];
			for(var I in this.ExecVars[this.ExecID])
			{
				if(I == Word)
				{
					Word = this.ExecVars[this.ExecID][Word];
					break;
				}
			}
			for(var I in this.Methods)
			{
				if(I+"()" == Word)
				{
					Word = this.Execute(this.Methods[Word.replace("()", "")], false);
					break;
				}
			}
			FinalWords.push(Word);
		}

		Str = FinalWords.join(" ");
		try {Str = math.eval(Str);}
		catch(e) {}

		return Str;
	}

	if(Str !== null)
	{
		var Ret = this.Execute(Str);
		if(isNaN(Ret)) this.Return = Ret;
		else this.Return = parseFloat(Ret);
	}
}
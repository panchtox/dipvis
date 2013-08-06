<?php
	class conector
	{
		private $connection;

		public function getConn() {
			return $this->connection;
		}
		
		public function __construct()
		{
		/*
		*constructor instantiates db connection
		*/
			$this->connection = @mysqli_connect("localhost","mayor","9eLfZr#5oY")
			or die("no se pudo conectar con el servidor mysql");
			mysqli_select_db($this->connection,"lenton") or die ("no se pudo conectar con la base de datos 'lenton'");
			// echo "eureka";
		}
	}
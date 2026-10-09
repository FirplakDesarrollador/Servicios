process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SAP = 'https://200.7.96.194:50000/b1s/v1';
async function run() {
  const lr = await fetch(SAP+'/Login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({CompanyDB:'Firplak_SA',UserName:'manager',Password:'2023Fir#.*'})});
  const cookie = lr.headers.get('set-cookie');
  const h = {'Cookie':cookie,'Content-Type':'application/json'};

  // Registrar SQLQuery para LDM Costos (BOM multi-nivel de OITT/ITT1)
  const sqlText = `/* Select From [dbo].[OITT] P0 */
Declare @Code1 Varchar(20) 
/* Where */
Set @Code1 = :code1;
 
/* Select From [dbo].[OITT] P1 */
Declare @Code2 Varchar(20) 
/* Where */
Set @Code2 = :code2;
 
Declare @linea int = 1;
 
if  OBJECT_ID('Planos_Symphony.dbo.BomGlobal') is not null
Begin
	Delete Planos_Symphony.dbo.BomGlobal
End;
 
if  OBJECT_ID('Planos_Symphony.dbo.BomNew') is not null
Begin
	Delete Planos_Symphony.dbo.BomNew
End;
 
Declare @Code Varchar(20) 
 
Declare @BodAlt Varchar(20) = 'MP-01'
Declare @LPrecio Varchar(10) = 10
 
Declare @Bodega_ Varchar(20)
Declare @Father_ Varchar(20)
Declare @Codigo_ Varchar(20)
Declare @Cantidad_ Decimal(18,6)
Declare @Desc	Varchar(100)
Declare @CostoU_ Decimal(18,6)
 
Declare @Bodega2_ Varchar(20)
Declare @Father2_ Varchar(20)
Declare @Codigo2_ Varchar(20)
Declare @Cantidad2_ Decimal(18,6)
 
Declare @Bodega3_ Varchar(20)
Declare @Father3_ Varchar(20)
Declare @Codigo3_ Varchar(20)
Declare @Cantidad3_ Decimal(18,6)
 
Declare @CostoMp_ Decimal(18,6)
Declare @CostoMo_ Decimal(18,6)
Declare @CostoCif_ Decimal(18,6)
 
Declare @TCostoMp_ Decimal(18,6)
Declare @TCostoMo_ Decimal(18,6)
Declare @TCostoCif_ Decimal(18,6)
 
Set @TCostoMp_ = 0
Set @TCostoMo_ = 0
Set @TCostoCif_ = 0
 
Declare MyCursorGlobal Cursor For
Select t0.ItemCode 
From OITM t0 
Inner Join (Select t0.Father
			From ITT1 t0
			Group By t0.Father) t1 On t0.ItemCode = t1.Father
Where t0.ItemCode >= @Code1 And t0.ItemCode <= @Code2
 
Open MyCursorGlobal
Fetch Next from MyCursorGlobal
Into @Code
 
If @@FETCH_STATUS = 0
Begin
		While @@FETCH_STATUS = 0
	    Begin
 
			if  OBJECT_ID('Planos_Symphony.dbo.BomNew') is not null
			Begin
				Delete Planos_Symphony.dbo.BomNew
			End;

			Declare MyCursor Cursor For
			Select t0.Warehouse, t0.Father, t0.Code, Quantity From ITT1 t0 Where t0.Father = @Code

			Open MyCursor
			Fetch Next from MyCursor
			Into @Bodega_, @Father_, @Codigo_, @Cantidad_


			Set @CostoU_ = 0
			Select @Desc = t0.ItemName From OITM t0 Where t0.ItemCode = @Code
			Insert Into Planos_Symphony.dbo.BomNew (Linea, Codigo, descripcion, nivel, cantidad, costo_unitario) Values (@linea, @Code, @Desc, 1, 1, @CostoU_)
			Set @linea = @linea + 1

			If @@FETCH_STATUS = 0
			Begin
					While @@FETCH_STATUS = 0
					Begin

						Select @Desc = t0.ItemName From OITM t0 Where t0.ItemCode = @Codigo_		 
						Select @CostoU_ = t0.AvgPrice From OITW t0 Where t0.ItemCode = @Codigo_ And t0.WhsCode = @Bodega_ 

						If (@CostoU_ = 0)
						   Select @CostoU_ = t0.AvgPrice From OITW t0 Where t0.ItemCode = @Codigo_ And t0.WhsCode = @BodAlt

						If (@CostoU_ = 0)
						   Select @CostoU_ = t1.Price
						   From OPLN t0
						   Inner Join ITM1 t1 On t0.ListNum = t1.PriceList
						   Where t0.ListNum = @LPrecio And t1.ItemCode = @Codigo_

						Select @CostoMp_ = t0.AvgPrice * @Cantidad_
						From OITW t0 
						Inner Join OITM t1 On t0.ItemCode = t1.ItemCode
						Where t0.ItemCode = @Codigo_ And t0.WhsCode = @Bodega_  And (t1.QryGroup39 = 'N' And t1.QryGroup39 = 'N')

						If (IsNull(@CostoMp_,0) = 0)
						   Select @CostoMp_ = (t0.AvgPrice * @Cantidad_) From OITM t0 Where t0.ItemCode = @Codigo_ And t0.EvalSystem = 'S'

						Select @CostoMo_ = t0.AvgPrice * @Cantidad_
						From OITW t0 
						Inner Join OITM t1 On t0.ItemCode = t1.ItemCode
						Where t0.ItemCode = @Codigo_ And t0.WhsCode = @Bodega_  And (t1.QryGroup39 = 'Y')

						Select @CostoCif_ = t0.AvgPrice * @Cantidad_
						From OITW t0 
						Inner Join OITM t1 On t0.ItemCode = t1.ItemCode
						Where t0.ItemCode = @Codigo_ And t0.WhsCode = @Bodega_  And (t1.QryGroup40 = 'Y')

						--Analisis de Niveles 3 y 4
						Declare MyCursorDet Cursor For
						Select t0.Warehouse, t0.Father, t0.Code, Quantity From ITT1 t0 Where t0.Father = @Codigo_

						Open MyCursorDet
						Fetch Next from MyCursorDet
						Into @Bodega2_, @Father2_, @Codigo2_, @Cantidad2_

						--Nivel 3
						If @@FETCH_STATUS = 0
						Begin

								--Encabezado Nivel 2
								Insert Into Planos_Symphony.dbo.BomNew (Linea, Codigo, descripcion, nivel, cantidad, costo_unitario, costo_mp, costo_mo, costo_cif, costo_total) 
																Values (@linea, @Codigo_, @Desc, 2, @Cantidad_, 0, 0, 0, 0, 0)
								Set @linea = @linea + 1
								

								While @@FETCH_STATUS = 0
								Begin
					   
									Select @Desc = t0.ItemName From OITM t0 Where t0.ItemCode = @Codigo2_		 
									Select @CostoU_ = t0.AvgPrice From OITW t0 Where t0.ItemCode = @Codigo2_ And t0.WhsCode = @Bodega2_ 

									If (@CostoU_ = 0)
									   Select @CostoU_ = t0.AvgPrice From OITW t0 Where t0.ItemCode = @Codigo2_ And t0.WhsCode = @BodAlt

									If (@CostoU_ = 0)
									   Select @CostoU_ = t1.Price
									   From OPLN t0
									   Inner Join ITM1 t1 On t0.ListNum = t1.PriceList
									   Where t0.ListNum = @LPrecio And t1.ItemCode = @Codigo2_


									Select @CostoMp_ = (t0.AvgPrice * @Cantidad2_ * @Cantidad_)
									From OITW t0 
									Inner Join OITM t1 On t0.ItemCode = t1.ItemCode
									Where t0.ItemCode = @Codigo2_ And t0.WhsCode = @Bodega2_  And (t1.QryGroup39 = 'N' And t1.QryGroup39 = 'N')

									If (IsNull(@CostoMp_,0) = 0)
									   Select @CostoMp_ = (t0.AvgPrice * @Cantidad2_) From OITM t0 Where t0.ItemCode = @Codigo2_ And t0.EvalSystem = 'S'
									
									Select @CostoMo_ = t0.AvgPrice * @Cantidad2_
									From OITW t0 
									Inner Join OITM t1 On t0.ItemCode = t1.ItemCode
									Where t0.ItemCode = @Codigo2_ And t0.WhsCode = @Bodega2_  And (t1.QryGroup39 = 'Y')

									Select @CostoCif_ = t0.AvgPrice * @Cantidad2_
									From OITW t0 
									Inner Join OITM t1 On t0.ItemCode = t1.ItemCode
									Where t0.ItemCode = @Codigo2_ And t0.WhsCode = @Bodega2_  And (t1.QryGroup40 = 'Y')

									--Nivel 4
									Declare MyCursorDet4 Cursor For
									Select t0.Warehouse, t0.Father, t0.Code, Quantity From ITT1 t0 Where t0.Father = @Codigo2_

									Open MyCursorDet4
									Fetch Next from MyCursorDet4
									Into @Bodega3_, @Father3_, @Codigo3_, @Cantidad3_

										If @@FETCH_STATUS = 0
										Begin
											--NIVEL 3	
											Insert Into Planos_Symphony.dbo.BomNew (Linea, Codigo, descripcion, nivel, cantidad, costo_unitario, costo_mp, costo_mo, costo_cif, costo_total) 
																					Values (@Linea, @Codigo2_, @Desc, 3, @Cantidad2_ * @Cantidad_, 0, 0, 0, 0, 0)
											Set @linea = @linea + 1
							    
												While @@FETCH_STATUS = 0
												Begin

													Select @Desc = t0.ItemName From OITM t0 Where t0.ItemCode = @Codigo3_		 
													Select @CostoU_ = t0.AvgPrice From OITW t0 Where t0.ItemCode = @Codigo3_ And t0.WhsCode = @Bodega3_ 

													If (@CostoU_ = 0)
													   Select @CostoU_ = t0.AvgPrice From OITW t0 Where t0.ItemCode = @Codigo3_ And t0.WhsCode = @BodAlt

													If (@CostoU_ = 0)
													   Select @CostoU_ = t1.Price
													   From OPLN t0
													   Inner Join ITM1 t1 On t0.ListNum = t1.PriceList
													   Where t0.ListNum = @LPrecio And t1.ItemCode = @Codigo3_

													Select @CostoMp_ = @CostoU_ * @Cantidad3_ * @Cantidad2_ * @Cantidad_  --UC
													
													If (IsNull(@CostoMp_,0) = 0)
													Select @CostoMp_ = (t0.AvgPrice * @Cantidad3_ * @Cantidad2_ * @Cantidad_) --UC
													From OITW t0 
													Inner Join OITM t1 On t0.ItemCode = t1.ItemCode
													Where t0.ItemCode = @Codigo3_ And t0.WhsCode = @Bodega3_  And (t1.QryGroup39 = 'N' And t1.QryGroup39 = 'N')

													If (IsNull(@CostoMp_,0) = 0)
													   Select @CostoMp_ = (t0.AvgPrice * @Cantidad3_* @Cantidad_) From OITM t0 Where t0.ItemCode = @Codigo3_ And t0.EvalSystem = 'S' --UC

													Select @CostoMo_ = t0.AvgPrice * @Cantidad3_ * @Cantidad2_* @Cantidad_ --UC
													From OITW t0 
													Inner Join OITM t1 On t0.ItemCode = t1.ItemCode
													Where t0.ItemCode = @Codigo3_ And t0.WhsCode = @Bodega3_  And (t1.QryGroup39 = 'Y')

													Select @CostoCif_ = t0.AvgPrice * @Cantidad3_ * @Cantidad2_* @Cantidad_ --UC
													From OITW t0 
													Inner Join OITM t1 On t0.ItemCode = t1.ItemCode
													Where t0.ItemCode = @Codigo3_ And t0.WhsCode = @Bodega3_  And (t1.QryGroup40 = 'Y')


													--Incluido Aqui
													If IsNull((Select t0.QryGroup39 From OITM t0 Where t0.ItemCode = @Codigo3_),'') = 'Y'
													Begin
														Set @CostoCif_ = 0
														Set @CostoMp_ = 0
													End
												    
													If  IsNull((Select t0.QryGroup40 From OITM t0 Where t0.ItemCode = @Codigo3_),'')= 'Y'
													Begin
														Set @CostoMo_ = 0
														Set @CostoMp_ = 0
													End

													If IsNull((Select t0.QryGroup39 From OITM t0 Where t0.ItemCode = @Codigo3_),'') = 'N' And 
														IsNull((Select t0.QryGroup40 From OITM t0 Where t0.ItemCode = @Codigo3_),'') = 'N'
													Begin
														Set @CostoCif_ = 0
														Set @CostoMo_ = 0
													End							
													--Hasta Aqui

													Insert Into Planos_Symphony.dbo.BomNew (Linea, Codigo, descripcion, nivel, cantidad, costo_unitario, costo_mp, costo_mo, costo_cif, costo_total) 
																							Values (@Linea, @Codigo3_, @Desc, 4, @Cantidad3_*@Cantidad2_*@Cantidad_, @CostoU_, @CostoMp_, @CostoMo_, @CostoCif_, ISNULL(@CostoMp_,0)+ISNULL(@CostoMo_,0)+ISNULL(@CostoCif_,0))
													Set @linea = @linea + 1

													Set @TCostoMp_ = @TCostoMp_ + @CostoMp_
													Set @TCostoMo_ = @TCostoMo_ + @CostoMo_
													Set @TCostoCif_ = @TCostoCif_ + @CostoCif_
										 
													Fetch Next from MyCursorDet4
													Into @Bodega3_, @Father3_, @Codigo3_, @Cantidad3_
												End
										End
										Else
											Begin
												--Inclui aqui lo nuevo
													Select @Desc = t0.ItemName From OITM t0 Where t0.ItemCode = @Codigo2_		 
													-----ACG Corrección bodega incorrecta 05/11/2025
														Select @CostoU_ = t0.AvgPrice From OITW t0 Where t0.ItemCode = @Codigo2_ And t0.WhsCode = @Bodega2_ 
													
													If (@CostoU_ = 0)
													Begin
													   Select @CostoU_ = t0.AvgPrice From OITW t0 Where t0.ItemCode = @Codigo2_ And t0.WhsCode = @BodAlt
													End

													If (@CostoU_ = 0)
													Begin
													   Select @CostoU_ = t1.Price
													   From OPLN t0
													   Inner Join ITM1 t1 On t0.ListNum = t1.PriceList
													   Where t0.ListNum = @LPrecio And t1.ItemCode = @Codigo2_
												    End
												    
												    Select @CostoMp_ = @CostoU_ *  @Cantidad2_ * @Cantidad_
												    If (IsNull(@CostoMp_,0) = 0)
												    Begin
														Select @CostoMp_ = (t0.AvgPrice * @Cantidad2_ * @Cantidad_)
														From OITW t0 
														Inner Join OITM t1 On t0.ItemCode = t1.ItemCode
														Where t0.ItemCode = @Codigo2_ And t0.WhsCode = @Bodega2_  And (t1.QryGroup39 = 'N' And t1.QryGroup39 = 'N')
												    End
												    
														If (IsNull(@CostoMp_,0) = 0)
														   Select @CostoMp_ = (t0.AvgPrice * @Cantidad2_) From OITM t0 Where t0.ItemCode = @Codigo2_ And t0.EvalSystem = 'S'
												
														Select @CostoMo_ = t0.AvgPrice * @Cantidad2_ * @Cantidad_
														From OITW t0 
														Inner Join OITM t1 On t0.ItemCode = t1.ItemCode
														Where t0.ItemCode = @Codigo2_ And t0.WhsCode = @Bodega2_  And (t1.QryGroup39 = 'Y')


														Select @CostoCif_ = t0.AvgPrice * @Cantidad2_ * @Cantidad_
														From OITW t0 
														Inner Join OITM t1 On t0.ItemCode = t1.ItemCode
														Where t0.ItemCode = @Codigo2_ And t0.WhsCode = @Bodega2_  And (t1.QryGroup40 = 'Y')
												
												--Hasta Aqui
											
												If IsNull((Select t0.QryGroup39 From OITM t0 Where t0.ItemCode = @Codigo2_),'') = 'Y'
												Begin
													Set @CostoCif_ = 0
													Set @CostoMp_ = 0
												End
												
												If IsNull((Select t0.QryGroup40 From OITM t0 Where t0.ItemCode = @Codigo2_),'') = 'Y'
												Begin
													Set @CostoMo_ = 0
													Set @CostoMp_ = 0
												End
												
												If IsNull((Select t0.QryGroup39 From OITM t0 Where t0.ItemCode = @Codigo2_),'') = 'N' And 
													IsNull((Select t0.QryGroup40 From OITM t0 Where t0.ItemCode = @Codigo2_),'') = 'N'
												Begin
													Set @CostoCif_ = 0
													Set @CostoMo_ = 0
												End

												Set @TCostoMp_ = @TCostoMp_ + @CostoMp_
												Set @TCostoMo_ = @TCostoMo_ + @CostoMo_
												Set @TCostoCif_ = @TCostoCif_ + @CostoCif_
												----
												--NIVEL 3
												Insert Into Planos_Symphony.dbo.BomNew (Linea, Codigo, descripcion, nivel, cantidad, costo_unitario, costo_mp, costo_mo, costo_cif, costo_total) 
																						Values (@Linea, @Codigo2_, @Desc, 3, @Cantidad2_* @Cantidad_, @CostoU_, @CostoMp_, @CostoMo_, @CostoCif_, ISNULL(@CostoMp_,0)+ISNULL(@CostoMo_,0)+ISNULL(@CostoCif_,0))
												Set @linea = @linea + 1										
																						
											End

										close MyCursorDet4
										deallocate MyCursorDet4

									Fetch Next from MyCursorDet
									Into @Bodega2_, @Father2_, @Codigo2_, @Cantidad2_
								End
						End
						Else
							Begin
								If IsNull((Select t0.QryGroup39 From OITM t0 Where t0.ItemCode = @Codigo_),'') = 'Y'
								Begin
									Set @TCostoMo_ = @TCostoMo_ + @CostoMo_
									Set @CostoCif_ = 0
									Set @CostoMp_ = 0
							    End
							    
								If  IsNull((Select t0.QryGroup40 From OITM t0 Where t0.ItemCode = @Codigo_),'')= 'Y'
								Begin
									Set @TCostoCif_ = @TCostoCif_ + @CostoCif_
									Set @CostoMo_ = 0
									Set @CostoMp_ = 0
								End

								If IsNull((Select t0.QryGroup39 From OITM t0 Where t0.ItemCode = @Codigo_),'') = 'N' And 
									IsNull((Select t0.QryGroup40 From OITM t0 Where t0.ItemCode = @Codigo_),'') = 'N'
								Begin
									Set @CostoCif_ = 0
									Set @CostoMo_ = 0
								End							
									
								Set @TCostoMp_ = @TCostoMp_ + @CostoMp_

								Insert Into Planos_Symphony.dbo.BomNew (Linea, Codigo, descripcion, nivel, cantidad, costo_unitario, costo_mp, costo_mo, costo_cif, costo_total) 
																		Values (@Linea, @Codigo_, @Desc, 2, @Cantidad_, @CostoU_, @CostoMp_, @CostoMo_, @CostoCif_, ISNULL(@CostoMp_,0)+ISNULL(@CostoMo_,0)+ISNULL(@CostoCif_,0))
								Set @linea = @linea + 1										
																		
							End

						close MyCursorDet
						deallocate MyCursorDet

		   
						Fetch Next from MyCursor
						Into @Bodega_, @Father_, @Codigo_, @Cantidad_
					End
			End

			Update Planos_Symphony.dbo.BomNew Set costo_mp = @TCostoMp_ Where codigo  = @Code And nivel = 1
			Update Planos_Symphony.dbo.BomNew Set costo_mo = @TCostoMo_ Where codigo  = @Code And nivel = 1
			Update Planos_Symphony.dbo.BomNew Set costo_cif = @TCostoCif_ Where codigo  = @Code And nivel = 1
			Update Planos_Symphony.dbo.BomNew Set costo_total = IsNull(@TCostoMp_,0) + IsNull(@TCostoMo_,0) + IsNull(@TCostoCif_,0) Where codigo = @Code And nivel = 1

			Set @TCostoCif_ = 0
			Set @TCostoMo_ = 0
			Set @TCostoMp_ = 0
			
			close MyCursor
			deallocate MyCursor

			Insert Into Planos_Symphony.dbo.BomGlobal
			Select * From Planos_Symphony.dbo.BomNew 

			Fetch Next from MyCursorGlobal
			Into @Code
		End
End

close MyCursorGlobal
deallocate MyCursorGlobal

Select t0.Codigo, t0.Descripcion, t1.SalUnitMsr UnidadMedida, t0.Nivel, t0.Cantidad, t0.Costo_Unitario, t0.Costo_Mp, t0.Costo_Mo, t0.Costo_Cif, t0.Costo_Total
From Planos_Symphony.dbo.BomGlobal t0 
Left Join OITM t1 On t0.Codigo collate SQL_Latin1_General_CP1_CI_AS = t1.ItemCode collate SQL_Latin1_General_CP1_CI_AS
Order By t0.linea\`;

  const payload = {
    SqlCode: 'ldm_costos_bom',
    SqlName: 'LDM Costos BOM Multi-Nivel',
    SqlText: sqlText,
    ParamList: 'code1,code2'
  };

  // Intentar crear la query
  const cr = await fetch(SAP+'/SQLQueries',{method:'POST',headers:h,body:JSON.stringify(payload)});
  console.log('Crear SQLQuery:', cr.status, await cr.text().then(t=>t.slice(0,300)));
}
run().catch(e=>console.error(e.message));

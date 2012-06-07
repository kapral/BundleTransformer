﻿namespace BundleTransformer.Less.HttpHandlers
{
	using System.Web;
	using System.Web.Caching;

	using Core;
	using Core.Assets;
	using Core.Configuration;
	using Core.FileSystem;
	using Core.HttpHandlers;
	using Core.Translators;

	/// <summary>
	/// HTTP-handler, which is responsible for text output 
	/// of translated LESS-asset
	/// </summary>
	public sealed class LessAssetHandler : AssetHandlerBase
	{
		/// <summary>
		/// Asset content type
		/// </summary>
		public override string ContentType
		{
			get { return Core.Constants.ContentType.Css; }
		}


		/// <summary>
		/// Constructs instance of LESS asset handler
		/// </summary>
		public LessAssetHandler()
			: this(HttpContext.Current.Cache, 
				BundleTransformerContext.Current.GetFileSystemWrapper(), 
				BundleTransformerContext.Current.GetCoreConfiguration().AssetHandler,
				BundleTransformerContext.Current.IsDebugMode)
		{ }

		/// <summary>
		/// Constructs instance of LESS asset handler
		/// </summary>
		/// <param name="cache">Server cache</param>
		/// <param name="fileSystemWrapper">File system wrapper</param>
		/// <param name="assetHandlerConfig">Configuration settings of HTTP-handler that responsible 
		/// for text output of processed asset</param>
		/// <param name="isDebugMode">Flag that web application is in debug mode</param>
		public LessAssetHandler(Cache cache, IFileSystemWrapper fileSystemWrapper, 
			AssetHandlerSettings assetHandlerConfig, bool isDebugMode) 
				: base(cache, fileSystemWrapper, assetHandlerConfig, isDebugMode)
		{ }


		/// <summary>
		/// Translates code of asset written on LESS to CSS-code
		/// </summary>
		/// <param name="asset">Asset with code written on LESS</param>
		/// <returns>Asset with translated code</returns>
		protected override IAsset ProcessAsset(IAsset asset)
		{
			ITranslator lessTranslator = BundleTransformerContext.Current.GetCssTranslatorInstance(
				Core.Constants.TranslatorName.LessTranslator);
			lessTranslator.IsDebugMode = _isDebugMode;

			IAsset processedAsset = lessTranslator.Translate(asset);

			return processedAsset;
		}
	}
}
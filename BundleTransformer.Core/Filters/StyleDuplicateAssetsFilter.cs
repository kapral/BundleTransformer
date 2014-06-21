﻿namespace BundleTransformer.Core.Filters
{
	using System;
	using System.Collections.Generic;
	using System.Linq;

	using Assets;
	using Resources;

	/// <summary>
	/// Filter that responsible for removal of duplicate style assets
	/// </summary>
	public sealed class StyleDuplicateAssetsFilter : IFilter
	{
		/// <summary>
		/// Removes a duplicate style assets
		/// </summary>
		/// <param name="assets">Set of style assets</param>
		/// <returns>Set of unique style assets</returns>
		public IList<IAsset> Transform(IList<IAsset> assets)
		{
			if (assets == null)
			{
				throw new ArgumentException(Strings.Common_ValueIsEmpty, "assets");
			}

			if (assets.Count == 0)
			{
				return assets;
			}

			var processedAssets = new List<IAsset>();

			foreach (var asset in assets)
			{
				string newAssetVirtualPath = Asset.RemoveAdditionalCssFileExtension(asset.VirtualPath);
				string newAssetVirtualPathInUppercase = newAssetVirtualPath.ToUpperInvariant();
				bool assetExist = processedAssets
					.Count(a =>
						Asset.RemoveAdditionalCssFileExtension(a.VirtualPath).ToUpperInvariant() == newAssetVirtualPathInUppercase
					) > 0;

				if (!assetExist)
				{
					processedAssets.Add(asset);
				}
			}

			return processedAssets;
		}
	}
}
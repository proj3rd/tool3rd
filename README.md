# tool3rd

Assistant for 3GPP telecommunication development

- [tool3rd](#tool3rd)
  - [Interface](#interface)
  - [Load Resources](#load-resources)
  - [Format Messages/IEs](#format-messagesies)
  - [Diff ASN.1](#diff-asn1)

## Interface

![](/internals/img/interface.png)

1. Menu
2. List of available resources

   Each resource can be loaded and unloaded

3. Main view
4. Memory usage

   If memory usage gets close to 100 percent, some resources shall be unloaded to load other resources

## Load Resources

In most cases, resources shall be loaded first

![](/internals/img/load_resources.png)

1. Load resources stored in your local PC. Supported file extensions are:

   - `.asn1`: ASN.1 with a valid expression
   - `.htm`, `.html`: RAN3 AP in tabular form

   If you have difficulties in getting proper files, see step 2 and step 3 below

2. Files can be downloaded from [specification repository][3gpp-specs] ready for tool3rd

   ![](/internals/img/repository.png)

   1. Select a branch
      - `master`: Includes RRC ASN.1 and RAN3 AP in tabular form (LTE and NR)
      - `feature/ran3-asn1`: In addition, includes RAN3 AP ASN.1
   2.
   3. Download Zip file, extract it and load a file with `Load local file`
   4.

3. `Load resources from cloud` automates step2 and step 1

   By clicking it, all resources in the `master` branch will be added in the resource list

   NOTE: _This automated method may work 5-6 times per 60 minutes per IP address_

   Therefore, if the app is used in a company where different PCs are recognized as a single public IP, it may not work well as expected

After resources are added in the list, resources will be actually available by clicking `load` button. Loading a resource may take tens of seconds to a couple of minutes. Once a resource is loaded, however, other functionalities such as `Format` and `Diff` may not take a long time

## Format Messages/IEs

![](/internals/img/format.png)

1. Move to Message > Format
2. Select a specification resource
   - Note that a resource shall be loaded on the right
3. This is a pool of information elements
4. Click `Normal` or `Expand` to add an IE to a format queue
   - `Normal`: Format an IE as-is
   - `Expand`: Expand an IE before format
5. If there are too many IEs to scroll up and down, IEs in the pool can be filtered by name
6. This is a format queue
7. Click `Remove` if ana IE does not have to be formatted
8. Clieck `Remove all` to remove all IEs from the format queue
9. Click `Format` to format IEs in the format queue

## Diff ASN.1

![](/internals/img/diff.png)

1. Move to Message > Diff
2. Select an old specification resource
3. Select an new Specification resource
   - Note that old and new resources shall be loaded on the right
4. Click `Diff` to diff the two specifications

[3gpp-specs]: https://github.com/3gpp-network/3gpp-specs
